"use client";

import React from "react";
import PracticeMode from "../components/auto-battle/PracticeMode";

export default function AutoBattlePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Auto Battle Mode</h1>
      <p className="mb-6">
        Welcome to the new Auto Battle system! In this mode, cards will automatically battle each other based on their stats and effects.
      </p>
      <div className="bg-white rounded-lg shadow-md p-6">
        <PracticeMode />
      </div>
    </div>
  );
}
