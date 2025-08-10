export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">문장을 분석하고 있습니다</h2>
        <p className="text-gray-400">AI가 텍스트에서 핵심 단어를 추출하고 있어요...</p>
      </div>
    </div>
  )
}
