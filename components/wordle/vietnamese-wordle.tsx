"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RotateCcw, HelpCircle, Loader2, CornerDownLeft, Delete } from "lucide-react"
import TutorialModal from "@/components/wordle/tutorial-modal"
import { toast } from "react-toastify"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"

// -- Merged client-side logic for Wordle & lookup --

// Local word lists and dictionary
import { wordList as wordListAll } from "@/lib/wordle"
import { wordList as wordListValid } from "@/lib/wordle_valid"
import vietDict from "@/lib/dictionary_vi.json"

// Shared logic to normalize Vietnamese text for matching
function normalize(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/\s+/g, "")
    .toUpperCase()
}

// POS chính
const POS_LABELS: Record<string, string> = {
  A: 'Tính từ',
  C: 'Liên từ',
  D: 'Phó từ',
  E: 'Giới từ',
  I: 'Thán từ',
  M: 'Lượng từ',
  N: 'Danh từ',
  O: 'Từ tình thái',
  P: 'Đại từ',
  R: 'Trạng từ',
  S: 'Từ đặc biệt',
  V: 'Động từ',
  X: 'Từ phụ trợ / khác',
  Z: 'Hậu tố',
  n: 'Chưa phân loại rõ'
};

// sub_pos
const SUB_POS_LABELS: Record<string, string> = {
  A: 'Tính từ nói chung',
  A0: 'Tính từ chỉ số lượng, trạng thái tổng quát',
  Ai: 'Tính từ chỉ khả năng, thuộc tính nội tại',
  Ao: 'Tính từ chỉ âm thanh, cảm giác',
  Ap: 'Tính từ phổ biến',
  Ar: 'Tính từ chỉ mức độ, cường độ',
  Ax: 'Tính từ đặc biệt',
  Vi: 'Động từ nội',
  Vm: 'Động từ phương pháp',
  Vs: 'Động từ không chuyển',
  Vt: 'Động từ chuyển',
  Vu: 'Động từ đặc biệt/thành ngữ',
  N: 'Danh từ nói chung',
  Na: 'Danh từ trừu tượng',
  Nc: 'Danh từ chỉ người',
  Ng: 'Danh từ giống loài',
  Nl: 'Danh từ đơn vị',
  Np: 'Danh từ riêng',
  Nt: 'Danh từ chỉ vật, hiện tượng',
  Nu: 'Danh từ số lượng',
  Nx: 'Danh từ chuyên biệt',
  Pd: 'Đại từ chỉ định',
  Pi: 'Đại từ nhân xưng',
  Pp: 'Đại từ sở hữu',
  Pq: 'Đại từ nghi vấn',
  C: 'Liên từ',
  D: 'Phó từ',
  E: 'Giới từ',
  I: 'Thán từ',
  Mc: 'Lượng từ đơn vị',
  Mo: 'Lượng từ số lượng',
  O: 'Từ tình thái',
  R: 'Trạng từ',
  S: 'Từ đặc biệt',
  X: 'Tổ hợp từ đặc biệt',
  XX: 'Từ lỗi/dữ liệu không xác định',
  Z: 'Hậu tố'
};

interface DictionaryMeaning {
  example: string
  sub_pos: string
  definition: string
  pos: string
}

// Look up a word locally from vietDict
function lookupWordLocally(word: string) {
  const inputNormalized = normalize(word)
  const entry = Object.entries(vietDict).find(
    ([key]) => key === word || normalize(key) === inputNormalized
  )
  if (!entry) return null

  const [originalWord, meanings] = entry
  const updatedMeanings = (meanings as DictionaryMeaning[]).map((m) => ({
    ...m,
    pos: POS_LABELS[m.pos] || m.pos,
    sub_pos: SUB_POS_LABELS[m.sub_pos] || m.sub_pos,
  }))

  return {
    exists: true,
    word: originalWord,
    meanings: updatedMeanings,
  }
}

const VIETNAMESE_KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["BACKSPACE", "Z", "X", "C", "V", "B", "N", "M", "ENTER"],
]

type LetterState = "correct" | "present" | "absent" | "empty"

interface GameState {
  board: string[][]
  currentRow: number
  currentCol: number
  gameStatus: "playing" | "won" | "lost"
  targetWord: string
  originalWord: string
  letterStates: Record<string, LetterState>
  hintCount: number
  hintedLetters: Set<string>
  syllableHint: string | null
}

interface WordMeaning {
  exists: boolean;
  word: string;
  meanings: Array<{
    example?: string;
    sub_pos?: string;
    definition: string;
    pos?: string;
  }>;
}

interface WordData {
  original: string
  normalized: string
}

export default function VietnameseWordle() {
  const [showTutorial, setShowTutorial] = useState<boolean>(true)
  const [isLoadingWord, setIsLoadingWord] = useState<boolean>(false)
  const [isCheckingWord, setIsCheckingWord] = useState<boolean>(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [finishTime, setFinishTime] = useState<number | null>(null)
  const [wordMeaning, setWordMeaning] = useState<WordMeaning | null>(null)

  const getElapsedTime = useCallback(() => {
    if (startTime && finishTime) {
      const timeInSeconds = Math.floor((finishTime - startTime) / 1000)
      const minutes = Math.floor(timeInSeconds / 60)
      const seconds = timeInSeconds % 60
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
    return null
  }, [startTime, finishTime])

  const [gameState, setGameState] = useState<GameState>({
    board: Array.from({ length: 6 }, () => Array(7).fill("")),
    currentRow: 0,
    currentCol: 0,
    gameStatus: "playing",
    targetWord: "",
    originalWord: "",
    letterStates: {},
    hintCount: 0,
    hintedLetters: new Set(),
    syllableHint: null,
  })

  // === Instead of fetching, pick a random word from wordListValid ===
  const getNewWord = useCallback((): WordData => {
    setIsLoadingWord(true)
    try {
      const randomIndex = Math.floor(Math.random() * wordListValid.length)
      const original = wordListValid[randomIndex]
      const normalized = normalize(original)
      return { original, normalized }
    } catch (error) {
      console.error("Error picking word:", error)
      return { original: "học sinh", normalized: "HOCSINH" }
    } finally {
      setIsLoadingWord(false)
    }
  }, [])

  // === Instead of fetching, check presence in local lists ===
  const localCheckWordExists = useCallback((word: string): boolean => {
    setIsCheckingWord(true)
    try {
      const normalizedInput = normalize(word)
      const normalizedListAll = wordListAll.map(normalize)
      return normalizedListAll.includes(normalizedInput)
    } catch (error) {
      console.error("Error checking word:", error)
      return false
    } finally {
      setIsCheckingWord(false)
    }
  }, [])

  // === Phân tích âm tiết để hiển thị hint cấu trúc ===
  const analyzeSyllableStructure = (originalWord: string): string => {
    const syllables = originalWord.trim().split(/\s+/)
    if (syllables.length === 2) {
      const firstLen = syllables[0].length
      const secondLen = syllables[1].length
      return `Từ gồm 2 âm tiết, âm đầu tiên có ${firstLen} chữ, âm thứ hai có ${secondLen} chữ.`
    }
    const clean = originalWord.replace(/\s+/g, "")
    const half = Math.ceil(clean.length / 2)
    const rest = clean.length - half
    return `Từ gồm 2 âm tiết (ước lượng), âm đầu tiên ~ ${half} chữ, âm thứ hai ~ ${rest} chữ.`
  }

  // === Khởi tạo/làm mới game ===
  const initializeGame = useCallback(() => {
    const wordData = getNewWord()
    setGameState({
      board: Array.from({ length: 6 }, () => Array(7).fill("")),
      currentRow: 0,
      currentCol: 0,
      gameStatus: "playing",
      targetWord: wordData.normalized,
      originalWord: wordData.original,
      letterStates: {},
      hintCount: 0,
      hintedLetters: new Set(),
      syllableHint: analyzeSyllableStructure(wordData.original),
    })
    setStartTime(Date.now())
    setFinishTime(null)
  }, [getNewWord])

  useEffect(() => {
    initializeGame()
  }, [initializeGame])

  const resetGame = useCallback(() => {
    initializeGame()
  }, [initializeGame])

  // === Hàm checkGuess, trả về mảng độ dài 7 với trạng thái từng chữ ===
  const checkGuess = useCallback((guess: string): LetterState[] => {
    const target = gameState.targetWord
    const result: LetterState[] = Array(7).fill("absent")
    const targetLetters = target.split("")
    const guessLetters = guess.split("")

    const targetLetterCount: Record<string, number> = {}
    for (const letter of targetLetters) {
      targetLetterCount[letter] = (targetLetterCount[letter] || 0) + 1
    }

    for (let i = 0; i < 7; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        result[i] = "correct"
        targetLetterCount[guessLetters[i]]--
      }
    }

    for (let i = 0; i < 7; i++) {
      if (result[i] !== "correct" && targetLetterCount[guessLetters[i]] > 0) {
        result[i] = "present"
        targetLetterCount[guessLetters[i]]--
      }
    }

    return result
  }, [gameState.targetWord])

  // === Tính kết quả từng hàng ===
  const rowResults = useMemo(() => {
    const results: (LetterState[] | null)[] = Array(6).fill(null)
    for (let row = 0; row < gameState.currentRow; row++) {
      const rowStr = gameState.board[row].join("")
      if (rowStr.length === 7) {
        results[row] = checkGuess(rowStr)
      }
    }
    return results
  }, [gameState.board, gameState.currentRow, checkGuess])

  // === Xử lý gợi ý từng chữ ===
  const getHint = useCallback(() => {
    if (gameState.hintCount >= 3) return

    const guessedLetters = new Set(
      gameState.board
        .slice(0, gameState.currentRow)
        .flat()
        .filter((l) => l !== "")
    )
    const used = new Set<string>([
      ...guessedLetters,
      ...Object.keys(gameState.letterStates),
      ...gameState.hintedLetters,
    ])
    const uniqTarget = Array.from(new Set(gameState.targetWord.split("")))
    const available = uniqTarget.filter((l) => !used.has(l))

    if (available.length > 0) {
      const rand = available[Math.floor(Math.random() * available.length)]
      setGameState((prev) => {
        const newSet = new Set(prev.hintedLetters)
        newSet.add(rand)
        return {
          ...prev,
          hintCount: prev.hintCount + 1,
          hintedLetters: newSet,
        }
      })
      toast.info(`Gợi ý: Chữ "${rand}" có trong từ!`, {
        position: "top-center",
        autoClose: 3000,
      })
    } else {
      setGameState((prev) => ({
        ...prev,
        hintCount: prev.hintCount + 1,
      }))
      toast.info("Không còn chữ nào để gợi ý!", {
        position: "top-center",
        autoClose: 3000,
      })
    }
  }, [gameState])

  // === Submit guess ===
  const submitGuess = useCallback(() => {
    const guess = gameState.board[gameState.currentRow].join("")
    if (guess.length !== 7) {
      toast.error("Từ phải có đủ 7 chữ cái!", {
        position: "top-center",
        autoClose: 3000,
      })
      return
    }

    if (guess === gameState.targetWord) {
      const result = checkGuess(guess)
      const newLetterStates = { ...gameState.letterStates }

      result.forEach((state, idx) => {
        const ch = guess[idx]
        const prevState = newLetterStates[ch]
        if (!prevState) {
          newLetterStates[ch] = state
        } else if (prevState === "absent" && state !== "absent") {
          newLetterStates[ch] = state
        } else if (prevState === "present" && state === "correct") {
          newLetterStates[ch] = "correct"
        }
      })
      setFinishTime(Date.now())
      setGameState((prev) => ({
        ...prev,
        letterStates: newLetterStates,
        gameStatus: "won",
        currentRow: prev.currentRow + 1,
        currentCol: 0,
      }))
      return
    }

    // Check locally
    const exists = localCheckWordExists(guess)
    if (!exists) {
      setGameState((prev) => {
        const newBoard = prev.board.map((r, idx) =>
          idx === prev.currentRow ? Array(7).fill("") : [...r]
        )
        return { ...prev, board: newBoard, currentCol: 0 }
      })
      toast.error("Từ không tồn tại trong từ điển!", {
        position: "top-center",
        autoClose: 3000,
      })
      return
    }

    const result = checkGuess(guess)
    const newLetterStates = { ...gameState.letterStates }

    result.forEach((state, idx) => {
      const ch = guess[idx]
      const prevState = newLetterStates[ch]
      if (!prevState) {
        newLetterStates[ch] = state
      } else if (prevState === "absent" && state !== "absent") {
        newLetterStates[ch] = state
      } else if (prevState === "present" && state === "correct") {
        newLetterStates[ch] = "correct"
      }
    })

    const isWin = guess === gameState.targetWord
    const isLoss = gameState.currentRow === 5 && !isWin
    if (isWin) setFinishTime(Date.now())

    setGameState((prev) => ({
      ...prev,
      letterStates: newLetterStates,
      gameStatus: isWin ? "won" : isLoss ? "lost" : "playing",
      currentRow: prev.currentRow + 1,
      currentCol: 0,
    }))
  }, [gameState, checkGuess, localCheckWordExists])

  // === Xử lý nhập bàn phím ===
  const handleKeyPress = useCallback(
    (key: string) => {
      if (gameState.gameStatus !== "playing" || isCheckingWord) return

      if (key === "ENTER") {
        if (gameState.currentCol === 7) {
          submitGuess()
        } else {
          toast.error("Từ phải có đủ 7 chữ cái!", {
            position: "top-center",
            autoClose: 3000,
          })
        }
      } else if (key === "BACKSPACE") {
        if (gameState.currentCol > 0) {
          setGameState((prev) => {
            const newBoard = prev.board.map((r) => [...r])
            newBoard[prev.currentRow][prev.currentCol - 1] = ""
            return {
              ...prev,
              board: newBoard,
              currentCol: prev.currentCol - 1,
            }
          })
        }
      } else if (/^[A-Z]$/.test(key)) {
        if (gameState.currentCol < 7) {
          setGameState((prev) => {
            const newBoard = prev.board.map((r) => [...r])
            newBoard[prev.currentRow][prev.currentCol] = key
            return {
              ...prev,
              board: newBoard,
              currentCol: prev.currentCol + 1,
            }
          })
        }
      }
    },
    [gameState, isCheckingWord, submitGuess]
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toUpperCase()
      if (k === "ENTER" || k === "BACKSPACE" || /^[A-Z]$/.test(k)) {
        e.preventDefault()
        handleKeyPress(k)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyPress])

  // === Lấy màu của ô ===
  const getTileColor = useCallback((row: number, col: number): string => {
    const letter = gameState.board[row][col]
    if (!letter) return "bg-gray-100 border-gray-300 dark:bg-neutral-800 dark:border-neutral-600"

    if (row >= gameState.currentRow) {
      return "bg-gray-100 border-gray-400 dark:bg-neutral-800 dark:border-neutral-500"
    }

    const rowRes = rowResults[row]
    if (!rowRes) {
      return "bg-gray-100 border-gray-400 dark:bg-neutral-800 dark:border-neutral-500"
    }

    const status = rowRes[col]
    switch (status) {
      case "correct":
        return "bg-green-500 dark:bg-emerald-600 text-white border-green-500 dark:border-emerald-600"
      case "present":
        return "dark:bg-amber-500 text-white dark:border-amber-500 bg-yellow-500 border-yellow-500"
      case "absent":
        return "dark:bg-neutral-500 bg-gray-500 text-white border-gray-500 dark:border-neutral-500"
      default:
        return "bg-gray-100 border-gray-400 dark:bg-neutral-800 dark:border-neutral-500"
    }
  }, [gameState.board, gameState.currentRow, rowResults])

  // === Hiển thị ký tự đúng vị trí ===
  const getDisplayLetter = useCallback((row: number, col: number): string => {
    const letter = gameState.board[row][col]
    if (!letter) return ""

    if (row >= gameState.currentRow) return letter

    const rowRes = rowResults[row]
    if (!rowRes) return letter

    if (rowRes[col] === "correct") {
      const cleanOriginal = gameState.originalWord.replace(/\s+/g, "").split("")
      return cleanOriginal[col] || letter
    }
    return letter
  }, [gameState.board, gameState.currentRow, gameState.originalWord, rowResults])

  // === Lấy màu phím chữ ===
  const getKeyColor = useCallback((key: string): string => {
    const state = gameState.letterStates[key]
    const isHinted = gameState.hintedLetters.has(key)
    if (isHinted && !state) {
      return "dark:bg-amber-400 bg-yellow-400 border-yellow-400 text-black dark:border-amber-400"
    }
    switch (state) {
      case "correct":
        return "bg-green-500 dark:bg-emerald-600 text-white border-green-500 dark:border-emerald-600"
      case "present":
        return "bg-amber-500 text-white border-amber-500"
      case "absent":
        return "bg-gray-500 text-white border-gray-500 dark:border-neutral-500"
      default:
        return "bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
    }
  }, [gameState.letterStates, gameState.hintedLetters])

  // === Use local dictionary for final word meaning ===
  useEffect(() => {
    if (gameState.gameStatus === "won" || gameState.gameStatus === "lost") {
      const localData = lookupWordLocally(gameState.originalWord)
      if (!localData) {
        setWordMeaning(null)
      } else {
        setWordMeaning(localData)
      }
    } else {
      setWordMeaning(null)
    }
  }, [gameState.gameStatus, gameState.originalWord])

  // Confetti effect when win
  useEffect(() => {
    if (gameState.gameStatus === "won") {
      confetti({
        particleCount: 60,
        spread: 90,
        angle: 90,
        gravity: 0.5,
        origin: { y: 0.45 }
      })
    }
  }, [gameState.gameStatus])

  if (isLoadingWord) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-neutral-900 dark:to-neutral-800 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 dark:text-teal-500 mb-4" />
            <p className="text-lg font-semibold">Đang tải từ mới...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen md:min-h-dvh-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-neutral-900 dark:to-neutral-800 transition-colors duration-200 md:p-4">
      <TutorialModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />

      <Card className="w-full min-h-screen md:min-h-full max-w-lg md:shadow-2xl border-0 bg-white/90 dark:bg-neutral-900 md:backdrop-blur-xl dark:border p-1 md:p-4">
        <CardHeader className="text-center p-4 md:p-4 pb-6 md:pb-4 space-y-0">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTutorial(true)}
              className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r text-neutral-600 hover:text-neutral-800 dark:text-white dark:hover:text-neutral-200 bg-clip-text flex items-center gap-0">
              Wordle
              <svg width="40" height="24" viewBox="0 0 36 36" className="inline-block">
                <path fill="#DA251D" d="M32 5H4a4 4 0 0 0-4 4v18a4 4 0 0 0 4 4h28a4 4 0 0 0 4-4V9a4 4 0 0 0-4-4z"></path>
                <path fill="#FF0" d="M19.753 16.037L18 10.642l-1.753 5.395h-5.672l4.589 3.333l-1.753 5.395L18 21.431l4.589 3.334l-1.753-5.395l4.589-3.333z"></path>
              </svg>
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={getHint}
                disabled={gameState.hintCount >= 3 || gameState.gameStatus !== "playing"}
                className="text-xs bg-white dark:bg-neutral-800 dark:text-white"
              >
                Còn {3 - gameState.hintCount} gợi ý
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetGame}
                className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {gameState.gameStatus === "won" && (
              <motion.div
                key="won"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ duration: 2.0, type: "spring" }}
                className="mt-4 p-4 bg-green-100 dark:bg-emerald-900/30 rounded-lg border border-green-200 dark:border-emerald-800"
              >
                <p className="text-green-800 dark:text-emerald-200 font-semibold text-lg">🎉 Chúc mừng! Bạn đã thắng!</p>
                <p className="text-green-700 dark:text-emerald-300 mt-2">
                  Từ cần tìm: <span className="font-bold text-xl">&ldquo;{gameState.originalWord}&ldquo;</span>
                </p>
                {getElapsedTime() && (
                  <p className="text-green-700 dark:text-emerald-300 mt-2">
                    ⏱️ Thời gian hoàn thành: <span className="font-semibold">{getElapsedTime()}</span>
                  </p>
                )}
                {wordMeaning && wordMeaning.meanings && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.5, type: "spring" }}
                    className="mt-3 text-left"
                  >
                    <p className="font-semibold text-green-800 dark:text-emerald-200">Giải nghĩa:</p>
                    <ul className="list-disc ml-5 mt-1 space-y-2">
                      {wordMeaning.meanings.map((m, idx) => (
                        <li key={idx}>
                          <span className="font-medium">{m.definition}</span>
                          {(m.pos || m.sub_pos) && (
                            <span className="block text-xs text-green-700 dark:text-emerald-300 mt-0.5">
                              {m.pos && <span><b>Loại:</b> {m.pos}</span>}
                              {m.pos && m.sub_pos && <span> · </span>}
                              {m.sub_pos && <span><b>Nhóm:</b> {m.sub_pos}</span>}
                            </span>
                          )}
                          {m.example && <span className="block text-xs text-green-700 dark:text-emerald-300 mt-0.5"><b>VD:</b> {m.example}</span>}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
                <Button className="mt-2" variant="outline" onClick={resetGame}>Bắt đầu game mới</Button>
              </motion.div>
            )}

            {gameState.gameStatus === "lost" && (
              <motion.div
                key="lost"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ duration: 2.0, type: "spring" }}
                className="mt-4 p-4 bg-red-100 dark:bg-rose-900/30 rounded-lg border border-red-200 dark:border-rose-800"
              >
                <p className="text-red-800 dark:text-rose-200 font-semibold text-lg">😔 Hết lượt rồi!</p>
                <p className="text-red-700 dark:text-rose-300 mt-2">
                  Từ cần tìm: <span className="font-bold text-xl">&ldquo;{gameState.originalWord}&ldquo;</span>
                </p>
                {wordMeaning && wordMeaning.meanings && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.5, type: "spring" }}
                    className="mt-3 text-left"
                  >
                    <p className="font-semibold text-red-800 dark:text-rose-200">Giải nghĩa:</p>
                    <ul className="list-disc ml-5 mt-1 space-y-2">
                      {wordMeaning.meanings.map((m, idx) => (
                        <li key={idx}>
                          <span className="font-medium">{m.definition}</span>
                          {(m.pos || m.sub_pos) && (
                            <span className="block text-xs text-red-700 dark:text-rose-300 mt-0.5">
                              {m.pos && <span><b>Loại:</b> {m.pos}</span>}
                              {m.pos && m.sub_pos && <span> · </span>}
                              {m.sub_pos && <span><b>Nhóm:</b> {m.sub_pos}</span>}
                            </span>
                          )}
                          {m.example && <span className="block text-xs text-red-700 dark:text-rose-300 mt-0.5">VD: {m.example}</span>}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
                <Button className="mt-2" variant="outline" onClick={resetGame}>Bắt đầu game mới</Button>
              </motion.div>
            )}
          </AnimatePresence>

          {gameState.syllableHint && gameState.gameStatus === "playing" && (
            <div className="mt-4 p-4 bg-blue-100 dark:bg-teal-900/30 rounded-lg border border-blue-200 dark:border-teal-800">
              <p className="text-blue-800 dark:text-teal-200 font-semibold text-sm">📝 Gợi ý cấu trúc:</p>
              <p className="text-blue-700 dark:text-teal-300 mt-1 text-sm">{gameState.syllableHint}</p>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0 space-y-6">
          <div className="grid grid-cols-7 gap-1.5 md:gap-2 mb-6 justify-center place-items-center px-2 md:px-8">
            {gameState.board.map((row, rowIndex) =>
              row.map((_, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    md:w-12 w-11 md:h-12 h-11 border-2 flex items-center justify-center
                    text-lg font-bold uppercase transition-all duration-300
                    rounded-sm md:rounded-md shadow-sm dark:text-white
                    ${getTileColor(rowIndex, colIndex)}
                  `}
                >
                  {getDisplayLetter(rowIndex, colIndex)}
                </div>
              ))
            )}
          </div>

          <div className="space-y-2">
            {VIETNAMESE_KEYBOARD_ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-1">
                {row.map((key) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    className={`
                      w-10 h-10 p-0 flex items-center justify-center
                      font-semibold transition-all duration-200 rounded-md shadow-sm
                      ${getKeyColor(key)}
                      ${key === "ENTER" || key === "BACKSPACE" ? "text-xs" : ""}
                    `}
                    onClick={() => handleKeyPress(key)}
                    disabled={gameState.gameStatus !== "playing" || isCheckingWord}
                  >
                    {key === "BACKSPACE" ? <Delete className="h-4 w-4" /> : key === "ENTER" ? <CornerDownLeft className="h-4 w-4" /> : key}
                  </Button>
                ))}
              </div>
            ))}
          </div>

          <div className="text-center text-sm pb-4 text-neutral-600 dark:text-neutral-400 space-y-2">
            <p className="font-medium">Đoán từ tiếng Việt gồm 7 chữ cái trong 6 lần thử!</p>
            <div className="flex justify-center items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="inline-block w-4 h-4 bg-green-500 dark:bg-emerald-600 rounded"></span>
                <span>Đúng vị trí</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-4 h-4 bg-yellow-500 dark:bg-amber-500 rounded"></span>
                <span>Sai vị trí</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-4 h-4 bg-gray-500 dark:bg-neutral-500 rounded"></span>
                <span>Không có</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
