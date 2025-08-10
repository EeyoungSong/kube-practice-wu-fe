"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Check, X, RotateCcw, Star, BookOpen } from "lucide-react"
import Link from "next/link"

interface ReviewWord {
  id: string
  word: string
  meaning: string
  partOfSpeech: string
  context: string
  options: string[]
  correctAnswer: number
}

export default function ReviewPage({ params }: { params: { id: string } }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [reviewComplete, setReviewComplete] = useState(false)

  // Mock review data
  const reviewWords: ReviewWord[] = [
    {
      id: "w1",
      word: "rapid",
      meaning: "빠른, 신속한",
      partOfSpeech: "형용사",
      context: "The rapid advancement of artificial intelligence has transformed various industries.",
      options: ["느린", "빠른", "큰", "작은"],
      correctAnswer: 1,
    },
    {
      id: "w2",
      word: "advancement",
      meaning: "발전, 진보",
      partOfSpeech: "명사",
      context: "The rapid advancement of artificial intelligence has transformed various industries.",
      options: ["후퇴", "발전", "정체", "감소"],
      correctAnswer: 1,
    },
    {
      id: "w3",
      word: "algorithms",
      meaning: "알고리즘",
      partOfSpeech: "명사",
      context: "Machine learning algorithms can process vast amounts of data efficiently.",
      options: ["데이터", "알고리즘", "컴퓨터", "프로그램"],
      correctAnswer: 1,
    },
  ]

  const currentWord = reviewWords[currentIndex]
  const progress = ((currentIndex + (showResult ? 1 : 0)) / reviewWords.length) * 100

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return
    setSelectedAnswer(answerIndex)
  }

  const handleSubmit = () => {
    if (selectedAnswer === null) return

    setShowResult(true)
    if (selectedAnswer === currentWord.correctAnswer) {
      setScore((prev) => prev + 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < reviewWords.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setSelectedAnswer(null)
      setShowResult(false)
    } else {
      setReviewComplete(true)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setShowResult(false)
    setScore(0)
    setReviewComplete(false)
  }

  if (reviewComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-green-400" />
            </div>
            <CardTitle className="text-2xl text-white">복습 완료!</CardTitle>
            <CardDescription className="text-gray-400">오늘의 복습을 모두 마쳤습니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">
                {score}/{reviewWords.length}
              </div>
              <p className="text-gray-400">정답률: {Math.round((score / reviewWords.length) * 100)}%</p>
            </div>

            <div className="space-y-3">
              <Link href={`/notes/${params.id}`}>
                <Button className="w-full bg-transparent border-gray-600 text-white hover:bg-gray-700" variant="outline">
                  <BookOpen className="w-4 h-4 mr-2" />
                  노트로 돌아가기
                </Button>
              </Link>
              <Button onClick={handleRestart} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white">
                <RotateCcw className="w-4 h-4 mr-2" />
                다시 복습하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/notes/${params.id}`}>
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                노트로 돌아가기
              </Button>
            </Link>
            <div className="text-center">
              <h1 className="text-xl font-bold text-white">단어 복습</h1>
              <p className="text-sm text-gray-400">
                {currentIndex + 1} / {reviewWords.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">점수</p>
              <p className="text-lg font-bold text-indigo-400">
                {score}/{reviewWords.length}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={progress} className="h-2 bg-gray-700" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-gray-700 bg-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-gray-500 text-gray-300">{currentWord.partOfSpeech}</Badge>
                <Badge variant="secondary" className="bg-gray-700 text-gray-300 border-gray-600">
                  {currentIndex + 1} / {reviewWords.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Context */}
              <div className="p-4 bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">문맥:</p>
                <p className="text-white italic">"{currentWord.context}"</p>
              </div>

              {/* Question */}
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-4">{currentWord.word}</h2>
                <p className="text-lg text-gray-400">위 단어의 뜻은 무엇인가요?</p>
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-3">
                {currentWord.options.map((option, index) => (
                  <Button
                    key={index}
                    variant={
                      showResult
                        ? index === currentWord.correctAnswer
                          ? "default"
                          : selectedAnswer === index
                            ? "destructive"
                            : "outline"
                        : selectedAnswer === index
                          ? "default"
                          : "outline"
                    }
                    className={`h-16 text-wrap ${
                      showResult
                        ? index === currentWord.correctAnswer
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : selectedAnswer === index
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                        : selectedAnswer === index
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                          : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                    }`}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showResult}
                  >
                    <div className="flex items-center gap-2">
                      {showResult && index === currentWord.correctAnswer && (
                        <Check className="w-4 h-4" />
                      )}
                      {showResult && selectedAnswer === index && index !== currentWord.correctAnswer && (
                        <X className="w-4 h-4" />
                      )}
                      {option}
                    </div>
                  </Button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {!showResult ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={selectedAnswer === null}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                    size="lg"
                  >
                    정답 확인
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                    size="lg"
                  >
                    {currentIndex < reviewWords.length - 1 ? "다음 문제" : "복습 완료"}
                  </Button>
                )}
              </div>

              {/* Result Message */}
              {showResult && (
                <div className={`p-4 rounded-lg text-center ${
                  selectedAnswer === currentWord.correctAnswer
                    ? "bg-green-900/30 border border-green-500"
                    : "bg-red-900/30 border border-red-500"
                }`}>
                  <p className={`font-medium ${
                    selectedAnswer === currentWord.correctAnswer
                      ? "text-green-300"
                      : "text-red-300"
                  }`}>
                    {selectedAnswer === currentWord.correctAnswer ? "정답입니다! 🎉" : "틀렸습니다 😔"}
                  </p>
                  <p className="text-gray-400 mt-1">
                    정답: <span className="text-white font-medium">{currentWord.meaning}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
