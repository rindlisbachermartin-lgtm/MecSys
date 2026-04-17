export function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4 border' : 'w-8 h-8 border-2'
  return (
    <div className="flex justify-center items-center py-12">
      <div className={`${s} border-primary/30 border-t-primary rounded-full animate-spin`} />
    </div>
  )
}

export function InlineSpinner() {
  return <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin inline-block" />
}
