"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/Card"
import { toast } from "@/hooks/use-toast"
import { Loader2, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [fullName, setFullName] = useState("")
    const [businessName, setBusinessName] = useState("")
    const [registrationNumber, setRegistrationNumber] = useState("")
    const [address, setAddress] = useState("")
    const [representative, setRepresentative] = useState("")
    const [category, setCategory] = useState("")
    const [type, setType] = useState("")
    const [showPassword, setShowPassword] = useState(false)
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
                    options: {
                        data: {
                            full_name: fullName,
                            requested_business_name: businessName,
                            requested_registration_number: registrationNumber,
                            requested_address: address,
                            requested_representative: representative,
                            requested_category: category,
                            requested_type: type
                        }
                    }
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
                    title: "회원가입 및 매장 생성 성공",
                    description: "환영합니다! 사업장 정보가 즉시 생성되었습니다.",
                })
                setIsSignUp(false)
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

            if (!isSignUp) {
                router.push("/")
                router.refresh()
            }
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
            <Card className="w-full max-w-lg mb-20 overflow-auto max-h-[90vh]">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">
                        {isSignUp ? "회원가입" : "로그인"}
                    </CardTitle>
                    <CardDescription>
                        {isSignUp ? "상세 사업자 정보를 입력해 주세요." : "Open-Cost Master에 오신 것을 환영합니다."}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleAuth}>
                    <CardContent className="space-y-4">
                        {isSignUp && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="fullName" className="text-sm font-medium">성함 (실명)</label>
                                        <Input id="fullName" placeholder="홍길동" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="representative" className="text-sm font-medium">대표자명</label>
                                        <Input id="representative" placeholder="홍길동" required value={representative} onChange={(e) => setRepresentative(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="businessName" className="text-sm font-medium">사업장 이름 (상호)</label>
                                    <Input id="businessName" placeholder="길동베이커리" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="regNo" className="text-sm font-medium">사업자 등록번호</label>
                                    <Input id="regNo" placeholder="000-00-00000" required value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="address" className="text-sm font-medium">사업장 주소</label>
                                    <Input id="address" placeholder="서울특별시 강남구..." required value={address} onChange={(e) => setAddress(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="category" className="text-sm font-medium">업종</label>
                                        <Input id="category" placeholder="음식업" required value={category} onChange={(e) => setCategory(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="type" className="text-sm font-medium">업태</label>
                                        <Input id="type" placeholder="제과점" required value={type} onChange={(e) => setType(e.target.value)} />
                                    </div>
                                </div>
                            </>
                        )}
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium leading-none">
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
                            <label htmlFor="password" className="text-sm font-medium leading-none">
                                비밀번호
                            </label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={6}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSignUp ? "가입 신청하기" : "로그인"}
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
