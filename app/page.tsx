import VietnameseWordle from "@/components/wordle/vietnamese-wordle"
import './globals.css'
import { ToastContainer } from "react-toastify"


export default function Page() {
    return (
        <>
            <VietnameseWordle />
            <ToastContainer
                position="top-right"
                autoClose={1500}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                theme="colored"
            />
        </>
    )
}
