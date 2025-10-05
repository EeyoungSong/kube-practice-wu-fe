"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookOpen, Plus, Star, User, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { languages } from "@/types/word";
import { categoryService } from "@/services";
import Image from "next/image";

interface Language {
  value: string;
  label: string;
}

interface HeaderProps {
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  languages: Language[];
}

export default function Header({
  selectedLanguage,
  setSelectedLanguage,
  languages,
}: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
  };
  return (
    <header className="border-b border-gray-700 bg-gray-900/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <div className="relative">
              <Image
                src="/star-icon.png"
                alt="Star Icon"
                width={32}
                height={32}
                className="text-indigo-400"
              />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-200 rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                단어의 우주
              </h1>
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            {/* Language Selection in Header */}
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <Select
                value={selectedLanguage}
                onValueChange={handleLanguageChange}
              >
                <SelectTrigger className="w-32 bg-gray-800 border-gray-800 text-white hover:bg-gray-700 focus:border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-800">
                  {languages.map((lang) => (
                    <SelectItem
                      key={lang.value}
                      value={lang.value}
                      className="text-white"
                    >
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {user ? (
              // 로그인된 사용자용 UI
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-transparent text-white hover:bg-gray-700 hover:border-none border-none focus:border-none">
                      <User className="w-4 h-4 mr-2" />
                      {user.username}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-gray-800 border-gray-600">
                    <DropdownMenuItem className="text-white hover:bg-gray-800 cursor-pointer">
                      <User className="w-4 h-4 mr-2" />내 정보
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-800" />
                    <DropdownMenuItem
                      className="text-red-400 hover:bg-gray-800 cursor-pointer"
                      onClick={logout}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      로그아웃
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              // 로그인하지 않은 사용자용 UI
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <Button
                    variant="outline"
                    className="bg-transparent border-gray-600 text-white hover:bg-gray-700"
                  >
                    로그인
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white">
                    회원가입
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
