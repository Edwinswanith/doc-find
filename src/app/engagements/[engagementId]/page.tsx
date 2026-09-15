import { SapphireWorkspacePage } from "@/components/SapphireWorkspacePage"
export default async function EngagementPage({ params }: { params: Promise<{ engagementId: string }> }) { return <SapphireWorkspacePage view="engagement" recordId={(await params).engagementId} /> }
