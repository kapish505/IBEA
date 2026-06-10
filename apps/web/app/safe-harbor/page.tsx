import { PostEvacuationDashboard } from "@/components/safe-harbor/PostEvacuationDashboard";

export default function SafeHarborPage() {
  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans text-text-primary pt-24 px-6 pb-6 max-w-[1400px] mx-auto w-full">
      <main className="flex-1 flex flex-col h-full">
        <PostEvacuationDashboard />
      </main>
    </div>
  );
}
