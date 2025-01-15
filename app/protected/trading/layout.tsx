import { TradingNav } from "./components/trading-nav";

export default function TradingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-6xl mx-auto">
      <TradingNav />
      {children}
    </div>
  );
}
