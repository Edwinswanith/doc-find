import { SapphireWorkspacePage } from "@/components/SapphireWorkspacePage"
export default async function OfferPage({ params }: { params: Promise<{ offerId: string }> }) { return <SapphireWorkspacePage view="offer" recordId={(await params).offerId} /> }
