"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"

interface TutorialModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-background/80 dark:bg-black/80 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-lg bg-background text-foreground dark:text-white border-border dark:bg-neutral-900 md:backdrop-blur-xl dark:border">
                <CardHeader className="relative">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 text-foreground hover:bg-muted dark:hover:bg-gray-800"
                        onClick={onClose}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                    <CardTitle className="text-2xl font-bold text-center">Cách Chơi</CardTitle>
                    <p className="text-center text-muted-foreground">Đoán từ tiếng Việt trong 6 lần thử.</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <p className="text-sm">• Mỗi lần đoán phải là một từ tiếng Việt hợp lệ gồm 7 chữ cái, không cần dấu câu.</p>
                        <p className="text-sm">• Màu sắc của các ô sẽ thay đổi để cho biết mức độ gần đúng của dự đoán.</p>
                        {/* <p className="text-sm">• Nên tắt bộ gõ tiếng Việt để tránh lỗi gõ phím.</p> */}
                        {/* <p className="text-sm">• Khi hoàn thành lượt chơi có thể bấm nút reload để bắt đầu lại.</p> */}
                        {/* <p className="text-sm">• Có thể sử dụng nút gợi ý để biết chữ nào có trong từ.</p> */}
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Ví dụ</h3>

                        <div className="space-y-3">
                            <div className="flex gap-1">
                                {["C", "Ấ", "U", "T", "R", "Ú", "C"].map((letter, index) => (
                                    <div
                                        key={index}
                                        className={`
                                            w-10 h-10 border-2 flex items-center justify-center
                                            text-sm font-bold uppercase
                                            ${index === 0 ? "bg-green-500 border-green-500 text-white" : "bg-muted border-border text-foreground"}
                                        `}
                                    >
                                        {letter}
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm text-muted-foreground">C có trong từ và ở đúng vị trí.</p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex gap-1">
                                {["H", "Ọ", "C", "S", "I", "N", "H"].map((letter, index) => (
                                    <div
                                        key={index}
                                        className={`
                                            w-10 h-10 border-2 flex items-center justify-center
                                            text-sm font-bold uppercase
                                            ${index === 1 ? "bg-yellow-500 border-yellow-500 text-white" : "bg-muted border-border text-foreground"}
                                        `}
                                    >
                                        {letter}
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm text-muted-foreground">Ọ có trong từ nhưng ở sai vị trí.</p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex gap-1">
                                {["G", "I", "A", "O", "V", "I", "E"].map((letter, index) => (
                                    <div
                                        key={index}
                                        className={`
                                            w-10 h-10 border-2 flex items-center justify-center
                                            text-sm font-bold uppercase
                                            ${index === 6 ? "bg-gray-500 border-gray-500 text-white" : "bg-muted border-border text-foreground"}
                                        `}
                                    >
                                        {letter}
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm text-muted-foreground">E không có trong từ.</p>
                        </div>
                    </div>

                    <Button
                        onClick={onClose}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3"
                    >
                        Bắt Đầu Chơi
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}