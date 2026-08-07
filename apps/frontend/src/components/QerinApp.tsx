"use client";

import { useEffect, useRef, useState } from "react";
import { PhoneFrame } from "./StatusBar";
import { AskScreen } from "./screens/AskScreen";
import { PayingScreen } from "./screens/PayingScreen";
import { AnswerScreen, type ReceiptLine } from "./screens/AnswerScreen";
import { DeveloperScreen } from "./screens/DeveloperScreen";
import { TopupModal } from "./TopupModal";
import { useQerinAnswer } from "@/lib/useQerinAnswer";
import { selectSourcesForDisplay } from "@/lib/selectSources";
import { getOrCreateAccountId, fetchBalance, requestTopup } from "@/lib/account";
import type { AnswerData, PaySource, Screen } from "@/lib/types";

const ANSWER_PRICE_USD = 0.15;

export function QerinApp() {
  const [screen, setScreen] = useState<Screen>("ask");
  const [questionValue, setQuestionValue] = useState("");
  const [question, setQuestion] = useState("");
  const [paySteps, setPaySteps] = useState<PaySource[]>([]);
  const [displayData, setDisplayData] = useState<AnswerData | null>(null);

  const [accountId, setAccountId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [showTopup, setShowTopup] = useState(false);
  const [topupReason, setTopupReason] = useState<string | null>(null);

  const { ask, status, errorMessage } = useQerinAnswer();

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const animationDone = useRef(false);
  const responseData = useRef<AnswerData | null>(null);
  const responseFailed = useRef(false);
  const balancePoll = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshBalance = async (id: string) => {
    try {
      const b = await fetchBalance(id);
      setBalance(b);
      return b;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    getOrCreateAccountId()
      .then((id) => {
        setAccountId(id);
        return refreshBalance(id);
      })
      .catch(() => setBalance(null));

    return () => {
      timers.current.forEach(clearTimeout);
      if (balancePoll.current) clearInterval(balancePoll.current);
    };
  }, []);

  const setStepStatus = (idx: number, stepStatus: PaySource["status"]) => {
    setPaySteps((steps) => steps.map((s, i) => (i === idx ? { ...s, status: stepStatus } : s)));
  };

  const tryFinish = () => {
    if (!animationDone.current) return;
    if (responseFailed.current) {
      setScreen("ask");
      return;
    }
    if (responseData.current) {
      setDisplayData(responseData.current);
      if (typeof responseData.current.balance === "number") setBalance(responseData.current.balance);
      setScreen("answer");
    }
  };

  // Cosmetic choreography only — the real backend pays sources in parallel and
  // does not stream per-source progress. See 06-frontend-integration.md, option 1:
  // this plays while the real request is in flight; the transition to the answer
  // screen is gated on both the animation finishing AND the real response arriving.
  const schedulePaying = (stepCount: number) => {
    const STEP_OFFSET = 700;
    const PAYING_TO_PAID = 550;
    for (let i = 0; i < stepCount; i++) {
      timers.current.push(setTimeout(() => setStepStatus(i, "paying"), 200 + i * STEP_OFFSET));
      timers.current.push(
        setTimeout(() => setStepStatus(i, "paid"), 200 + i * STEP_OFFSET + PAYING_TO_PAID)
      );
    }
    timers.current.push(
      setTimeout(() => {
        animationDone.current = true;
        tryFinish();
      }, 200 + stepCount * STEP_OFFSET + 250)
    );
  };

  const onSubmit = () => {
    const q = questionValue.trim();
    if (!q || !accountId) return;

    // Pre-flight: skip the paying animation entirely if we already know the
    // balance can't cover it — the backend re-checks anyway (race-safe),
    // this is purely to avoid a pointless animation cycle.
    if (balance !== null && balance < ANSWER_PRICE_USD) {
      setTopupReason("Your balance is too low for another question.");
      setShowTopup(true);
      return;
    }

    timers.current.forEach(clearTimeout);
    timers.current = [];
    animationDone.current = false;
    responseData.current = null;
    responseFailed.current = false;

    const sources = selectSourcesForDisplay(q);
    setPaySteps(
      sources.map((s) => ({ name: s.name, amount: s.priceUsd, hash: "", status: "waiting" as const }))
    );
    setQuestion(q);
    setQuestionValue("");
    setScreen("paying");
    schedulePaying(sources.length);

    ask(q, accountId).then((result) => {
      if (result.ok) {
        responseData.current = result.data;
      } else if (result.reason === "insufficient_balance") {
        responseFailed.current = true;
        setTopupReason("Your balance ran out while asking that question.");
        setShowTopup(true);
        if (accountId) refreshBalance(accountId);
      } else {
        responseFailed.current = true;
      }
      tryFinish();
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onSubmit();
  };

  const onReset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setScreen("ask");
    setQuestion("");
    setDisplayData(null);
    setPaySteps([]);
  };

  const onGoDeveloper = () => {
    setScreen("developer");
  };

  const onGoHome = () => {
    setScreen("ask");
  };

  const onTopupClick = () => {
    setTopupReason(null);
    setShowTopup(true);
  };

  const onTopup = async (amountUsd: number) => {
    if (!accountId) return;
    const url = await requestTopup(accountId, amountUsd);
    window.open(url, "_blank", "noopener,noreferrer");

    // No webhook wired up client-side — poll while the checkout tab is
    // likely open. GET /v1/account/balance itself reconciles completed
    // Onramp purchases server-side on every call (see onramp.ts's
    // syncDeposits), so this just needs to keep asking.
    if (balancePoll.current) clearInterval(balancePoll.current);
    let ticks = 0;
    balancePoll.current = setInterval(async () => {
      ticks += 1;
      const b = await refreshBalance(accountId);
      if ((b !== null && b >= ANSWER_PRICE_USD) || ticks > 40) {
        if (balancePoll.current) clearInterval(balancePoll.current);
      }
    }, 4000);
  };

  const receiptLines: ReceiptLine[] =
    displayData?.receipt.map((r) => ({
      name: r.source,
      amountLabel: `$${r.amountPaid}`,
      hash: r.txHash ?? "—",
      explorerUrl: r.basescanUrl ?? "#",
      content: r.content,
    })) ?? [];

  return (
    <PhoneFrame>
      {screen === "ask" && (
        <AskScreen
          questionValue={questionValue}
          onQuestionChange={setQuestionValue}
          onKeyDown={onKeyDown}
          onSubmit={onSubmit}
          onGoDeveloper={onGoDeveloper}
          errorMessage={status === "error" ? errorMessage : null}
          balance={balance}
          onTopupClick={onTopupClick}
        />
      )}
      {screen === "paying" && <PayingScreen question={question} paySteps={paySteps} />}
      {screen === "answer" && displayData && (
        <AnswerScreen
          question={displayData.question}
          answer={displayData.answer}
          totalLabel={`$${displayData.totalPaid}`}
          receiptLines={receiptLines}
          onReset={onReset}
        />
      )}
      {screen === "developer" && <DeveloperScreen onGoHome={onGoHome} />}
      {showTopup && (
        <TopupModal reason={topupReason} onClose={() => setShowTopup(false)} onTopup={onTopup} />
      )}
    </PhoneFrame>
  );
}
