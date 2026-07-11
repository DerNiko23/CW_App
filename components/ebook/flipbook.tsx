"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import HTMLFlipBook from "react-pageflip";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAGE_COUNT = 30;
const PAGE_WIDTH = 1188;
const PAGE_HEIGHT = 1782;
const PAGE_NUMBERS = Array.from({ length: PAGE_COUNT }, (_, i) => i + 1);

function pageSrc(page: number) {
  return `/ebook/pages/${String(page).padStart(2, "0")}.jpg`;
}

const Page = forwardRef<HTMLDivElement, { page: number; priority?: boolean }>(function Page(
  { page, priority },
  ref,
) {
  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden bg-[#fdf6ec]">
      <Image
        src={pageSrc(page)}
        alt={`Seite ${page}`}
        width={PAGE_WIDTH}
        height={PAGE_HEIGHT}
        priority={priority}
        unoptimized
        className="h-full w-full object-contain"
      />
    </div>
  );
});

// react-pageflip liefert keinen exportierten Instanz-Typ - die Methoden
// (flipNext/flipPrev/getPageCount) kommen zur Laufzeit von `page-flip`.
type PageFlipInstance = {
  flipNext: () => void;
  flipPrev: () => void;
  getCurrentPageIndex: () => number;
};
type FlipBookHandle = { pageFlip: () => PageFlipInstance };

export function Flipbook() {
  const bookRef = useRef<FlipBookHandle | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const handleFlip = useCallback((e: { data: number }) => {
    setCurrentPage(e.data);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const flip = bookRef.current?.pageFlip();
      if (!flip) return;
      if (e.key === "ArrowLeft") flip.flipPrev();
      else flip.flipNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="mx-auto min-h-[420px] w-full max-w-[900px]">
        <HTMLFlipBook
          ref={bookRef}
          width={400}
          height={600}
          size="stretch"
          minWidth={260}
          maxWidth={560}
          minHeight={390}
          maxHeight={840}
          startPage={0}
          drawShadow
          flippingTime={700}
          usePortrait
          startZIndex={0}
          autoSize
          maxShadowOpacity={0.5}
          showCover
          mobileScrollSupport
          clickEventForward
          useMouseEvents
          swipeDistance={30}
          showPageCorners
          disableFlipByClick={false}
          className="mx-auto"
          style={{}}
          onFlip={handleFlip}
        >
          {PAGE_NUMBERS.map((page) => (
            <Page key={page} page={page} priority={page <= 2} />
          ))}
        </HTMLFlipBook>
      </div>

      <p className="text-sm text-muted-foreground">
        Seite {currentPage + 1} von {PAGE_COUNT}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => bookRef.current?.pageFlip().flipPrev()}
          disabled={currentPage === 0}
          aria-label="Vorherige Seite"
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => bookRef.current?.pageFlip().flipNext()}
          disabled={currentPage >= PAGE_COUNT - 1}
          aria-label="Nächste Seite"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
