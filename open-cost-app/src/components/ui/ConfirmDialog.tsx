import { Button } from "./Button"
import { Dialog } from "./Dialog"

interface ConfirmDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: "default" | "destructive"
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "확인",
    cancelText = "취소",
    variant = "destructive"
}: ConfirmDialogProps) {
    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            description={description}
        >
            <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={onClose}>
                    {cancelText}
                </Button>
                <Button
                    variant={variant === "destructive" ? "destructive" : "default"}
                    onClick={() => {
                        onConfirm()
                        onClose()
                    }}
                >
                    {confirmText}
                </Button>
            </div>
        </Dialog>
    )
}
