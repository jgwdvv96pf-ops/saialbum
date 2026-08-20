import BlackjackTable from "@/components/blackjack/Table";

export default function BlackjackRoomPage({ params }: { params: { code: string } }) {
  return <BlackjackTable code={params.code.toUpperCase()} />;
}
