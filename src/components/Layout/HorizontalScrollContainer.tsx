import React, { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface HorizontalScrollContainerProps {
  children: React.ReactNode
  className?: string
}

const HorizontalScrollContainer: React.FC<HorizontalScrollContainerProps> = ({ children, className = '' }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' })
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Botão Esquerda */}
      <button
        onClick={scrollLeft}
        className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-lg border border-gray-200 rounded-full p-2 hover:bg-gray-50 transition-colors"
        aria-label="Rolar para esquerda"
      >
        <ChevronLeft className="h-5 w-5 text-gray-600" />
      </button>

      {/* Container de rolagem */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto px-12"
style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex space-x-6">
          {children}
        </div>
      </div>

      {/* Botão Direita */}
      <button
        onClick={scrollRight}
        className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-lg border border-gray-200 rounded-full p-2 hover:bg-gray-50 transition-colors"
        aria-label="Rolar para direita"
      >
        <ChevronRight className="h-5 w-5 text-gray-600" />
      </button>


    </div>
  )
}

export default HorizontalScrollContainer