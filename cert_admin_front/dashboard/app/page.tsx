"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";


export default function Home() {
    const router = useRouter();

    useEffect(() => {
        router.push("login");
    }, [router]);
    return (
        <div>
            <h1>Dashboard</h1>
            <p>Welcome to the dashboard!</p>
        </div>
    )
}