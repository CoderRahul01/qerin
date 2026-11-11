use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Qer1n111111111111111111111111111111111111111");

#[program]
pub mod qerin_vault {
    use super::*;

    /// Initialize a non-custodial user vault for autonomous agent micropayments.
    /// The user specifies maximum spend allowed per single query and per epoch (e.g. 24 hours).
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        max_per_query: u64,
        epoch_limit: u64,
        epoch_duration_seconds: i64,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.owner.key();
        vault.agent_signer = ctx.accounts.agent_signer.key();
        vault.max_per_query = max_per_query;
        vault.epoch_limit = epoch_limit;
        vault.epoch_duration = epoch_duration_seconds;
        vault.current_epoch_spent = 0;
        vault.epoch_start_time = Clock::get()?.unix_timestamp;
        vault.bump = ctx.bumps.vault;

        emit!(VaultInitializedEvent {
            owner: vault.owner,
            agent_signer: vault.agent_signer,
            max_per_query,
            epoch_limit,
            epoch_duration: epoch_duration_seconds,
        });

        Ok(())
    }

    /// Agent executes a micro-payment to a data publisher for x402 content.
    /// Hard on-chain limits prevent the agent from overspending.
    pub fn pay_source(
        ctx: Context<PaySource>,
        amount_to_publisher: u64,
        protocol_fee: u64,
        query_hash: [u8; 32],
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let now = Clock::get()?.unix_timestamp;

        // Reset epoch if duration has elapsed
        if now >= vault.epoch_start_time + vault.epoch_duration {
            vault.current_epoch_spent = 0;
            vault.epoch_start_time = now;
        }

        let total_deduction = amount_to_publisher
            .checked_add(protocol_fee)
            .ok_or(ErrorCode::MathOverflow)?;

        // Enforce on-chain guardrails
        require!(
            total_deduction <= vault.max_per_query,
            ErrorCode::ExceedsPerQueryLimit
        );
        require!(
            vault.current_epoch_spent + total_deduction <= vault.epoch_limit,
            ErrorCode::ExceedsEpochLimit
        );

        vault.current_epoch_spent += total_deduction;

        // Authority seeds for PDA signing
        let owner_key = vault.owner;
        let seeds = &[
            b"qerin_vault",
            owner_key.as_ref(),
            &[vault.bump],
        ];
        let signer = &[&seeds[..]];

        // 1. Transfer payment to publisher
        if amount_to_publisher > 0 {
            let cpi_accounts_pub = Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.publisher_token_account.to_account_info(),
                authority: vault.to_account_info(),
            };
            let cpi_ctx_pub = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts_pub,
                signer,
            );
            token::transfer(cpi_ctx_pub, amount_to_publisher)?;
        }

        // 2. Transfer protocol service fee to treasury
        if protocol_fee > 0 {
            let cpi_accounts_fee = Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: vault.to_account_info(),
            };
            let cpi_ctx_fee = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts_fee,
                signer,
            );
            token::transfer(cpi_ctx_fee, protocol_fee)?;
        }

        emit!(QuerySettledEvent {
            owner: vault.owner,
            publisher: ctx.accounts.publisher_token_account.key(),
            total_paid: total_deduction,
            query_hash,
            timestamp: now,
        });

        Ok(())
    }

    /// Owner updates spending limits or agent signer key
    pub fn update_limits(
        ctx: Context<UpdateLimits>,
        new_max_per_query: u64,
        new_epoch_limit: u64,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.max_per_query = new_max_per_query;
        vault.epoch_limit = new_epoch_limit;
        Ok(())
    }

    /// Owner withdraws funds from the vault PDA back to their wallet
    pub fn withdraw(ctx: Context<WithdrawFunds>, amount: u64) -> Result<()> {
        let vault = &ctx.accounts.vault;
        let owner_key = vault.owner;
        let seeds = &[
            b"qerin_vault",
            owner_key.as_ref(),
            &[vault.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.owner_token_account.to_account_info(),
            authority: vault.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );
        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1,
        seeds = [b"qerin_vault", owner.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, VaultAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK: Authorized agent signer public key
    pub agent_signer: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PaySource<'info> {
    #[account(
        mut,
        seeds = [b"qerin_vault", vault.owner.as_ref()],
        bump = vault.bump,
        has_one = agent_signer
    )]
    pub vault: Account<'info, VaultAccount>,
    pub agent_signer: Signer<'info>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub publisher_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateLimits<'info> {
    #[account(
        mut,
        seeds = [b"qerin_vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner
    )]
    pub vault: Account<'info, VaultAccount>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(
        seeds = [b"qerin_vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner
    )]
    pub vault: Account<'info, VaultAccount>,
    pub owner: Signer<'info>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub owner_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct VaultAccount {
    pub owner: Pubkey,
    pub agent_signer: Pubkey,
    pub max_per_query: u64,
    pub epoch_limit: u64,
    pub epoch_duration: i64,
    pub current_epoch_spent: u64,
    pub epoch_start_time: i64,
    pub bump: u8,
}

#[event]
pub struct VaultInitializedEvent {
    pub owner: Pubkey,
    pub agent_signer: Pubkey,
    pub max_per_query: u64,
    pub epoch_limit: u64,
    pub epoch_duration: i64,
}

#[event]
pub struct QuerySettledEvent {
    pub owner: Pubkey,
    pub publisher: Pubkey,
    pub total_paid: u64,
    pub query_hash: [u8; 32],
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Math overflow occurred.")]
    MathOverflow,
    #[msg("Payment exceeds max allowed per-query limit.")]
    ExceedsPerQueryLimit,
    #[msg("Payment exceeds allowed spend limit for current epoch.")]
    ExceedsEpochLimit,
}
