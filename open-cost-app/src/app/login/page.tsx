"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/Card"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const router = useRouter()

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                })
                if (error) throw error

                // 중요: 이메일 인증이 켜져있으면 session이 null로 옴
                if (data.user && !data.session) {
                    toast({
                        title: "회원가입 대기중 (이메일 인증 필요)",
                        description: "Supabase 대시보드에서 'Email Confirm'을 끄거나, 받은 메일에서 인증을 완료해주세요.",
                    })
                    alert("⚠️ 확인해주세요!\n\nSupabase 설정에서 'Email Confirmation'이 켜져있으면 로그인이 바로 안 됩니다.\n\nSupabase Dashboard -> Authentication -> Providers -> Email -> 'Confirm email'을 끄고 다시 가입/로그인 시도해주세요.")
                    setLoading(false)
                    return
                }

                toast({
                    title: "회원가입 성공",
                    description: "가입해주셔서 감사합니다! 자동으로 로그인됩니다.",
                })
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                toast({
                    title: "로그인 성공",
                    description: "환영합니다!",
                })
            }

            router.push("/")
            router.refresh()
        } catch (error: any) {
            console.error("Auth Error:", error)
            toast({
                title: isSignUp ? "가입 실패" : "로그인 실패",
                description: error.message || "오류가 발생했습니다.",
                type: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">
                        {isSignUp ? "회원가입" : "로그인"}
                    </CardTitle>
                    <CardDescription>
                        Open-Cost Master에 오신 것을 환영합니다.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleAuth}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                이메일
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                비밀번호
                            </label>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={6}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSignUp ? "가입하기" : "로그인"}
                        </Button>
                        <div className="text-center text-sm text-muted-foreground">
                            {isSignUp ? "이미 계정이 있으신가요?" : "계정이 없으신가요?"}{" "}
                            <button
                                type="button"
                                className="underline underline-offset-4 hover:text-primary"
                                onClick={() => setIsSignUp(!isSignUp)}
                            >
                                {isSignUp ? "로그인" : "회원가입"}
                            </button>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
