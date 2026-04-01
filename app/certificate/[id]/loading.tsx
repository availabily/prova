export default function CertificateLoading() {
  return (
    <div className="min-h-screen pt-24 pb-24 px-6 max-w-3xl mx-auto space-y-10">
      <div className="border border-border p-8 space-y-6 animate-pulse">
        <div className="h-4 w-32 bg-surface rounded" />
        <div className="h-12 w-48 bg-surface rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 bg-surface rounded" />
          ))}
        </div>
      </div>
      <div className="border border-border" style={{ height: 360, background: '#0D0D0D' }} />
    </div>
  )
}
