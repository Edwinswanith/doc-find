import Link from "next/link"
export default function NotFound() { return <div className="df-route-state"><strong>That workspace page is unavailable.</strong><p>It may not exist or may be outside your authorised role.</p><Link className="df-primary" href="/">Return to workspace</Link></div> }
