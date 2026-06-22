import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useAppMode } from "../contexts/AppModeContext";

export default function NotFound() {
  const [location, setLocation] = useLocation();
  const { appMode } = useAppMode();

  const handleGoHome = () => {
    setLocation("/");
  };

  const scripts = typeof window !== "undefined"
    ? Array.from(document.querySelectorAll("script")).map(s => s.src || s.id || "inline")
    : [];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-lg mx-4 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-red-500" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>

          <h2 className="text-xl font-semibold text-slate-700 mb-4">
            Page Not Found
          </h2>

          <p className="text-slate-600 mb-6 leading-relaxed">
            Sorry, the page you are looking for doesn't exist.
            <br />
            It may have been moved or deleted.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center mb-6"
          >
            <Button
              onClick={handleGoHome}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>

          <div className="p-4 bg-slate-100/80 rounded-xl text-left text-xs font-mono space-y-2 overflow-auto max-h-48 border border-slate-200">
            <h3 className="font-bold text-slate-700 border-b pb-1 mb-1">🔍 Debug Info:</h3>
            <div><strong>Href:</strong> {typeof window !== "undefined" ? window.location.href : "SSR"}</div>
            <div><strong>Wouter Path:</strong> {location}</div>
            <div><strong>AppMode:</strong> {appMode}</div>
            <div><strong>Scripts:</strong></div>
            <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-500 max-h-20 overflow-y-auto">
              {scripts.map((src, i) => (
                <li key={i} className="break-all">{src}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
