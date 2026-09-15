"use client"
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="df-route-state"><strong>We could not load this workspace.</strong><p>Your records have not been changed.</p><button className="df-primary" type="button" onClick={reset}>Try again</button></div> }
