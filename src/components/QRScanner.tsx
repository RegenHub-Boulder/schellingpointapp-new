'use client'

import * as React from 'react'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'
import { Camera, CameraOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface QRScannerProps {
  /** Callback when a QR code is scanned */
  onScan: (data: string) => void
  /** Callback when scanning encounters an error */
  onError?: (error: string) => void
  /** Whether scanning is currently paused */
  paused?: boolean
  /** Custom class name */
  className?: string
  /** Preferred camera facing mode */
  facingMode?: 'environment' | 'user'
}

export function QRScanner({
  onScan,
  onError,
  paused = false,
  className,
  facingMode = 'environment',
}: QRScannerProps) {
  const scannerRef = React.useRef<Html5QrcodeScanner | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isScanning, setIsScanning] = React.useState(false)
  const [hasCamera, setHasCamera] = React.useState(true)
  const [lastError, setLastError] = React.useState<string | null>(null)
  const scannerId = React.useId().replace(/:/g, '')

  const initScanner = React.useCallback(() => {
    if (!containerRef.current || scannerRef.current) return

    try {
      const scanner = new Html5QrcodeScanner(
        `qr-reader-${scannerId}`,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
        },
        false
      )

      scanner.render(
        (decodedText) => {
          // Success callback
          onScan(decodedText)
        },
        (errorMessage) => {
          // Error callback (e.g., no QR found in frame)
          // Only report actual errors, not "QR code not found" messages
          if (errorMessage.includes('No MultiFormat Readers')) {
            // This is fine, just means no QR in current frame
            return
          }
          if (errorMessage.includes('NotFoundException')) {
            return
          }
          setLastError(errorMessage)
          onError?.(errorMessage)
        }
      )

      scannerRef.current = scanner
      setIsScanning(true)
      setLastError(null)
    } catch (err) {
      console.error('Failed to initialize scanner:', err)
      setHasCamera(false)
      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize camera'
      setLastError(errorMsg)
      onError?.(errorMsg)
    }
  }, [scannerId, onScan, onError])

  const stopScanner = React.useCallback(() => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear()
      } catch {
        // Ignore cleanup errors
      }
      scannerRef.current = null
      setIsScanning(false)
    }
  }, [])

  const restartScanner = React.useCallback(() => {
    stopScanner()
    setTimeout(() => {
      initScanner()
    }, 100)
  }, [stopScanner, initScanner])

  // Initialize scanner on mount
  React.useEffect(() => {
    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (!paused) {
        initScanner()
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      stopScanner()
    }
  }, [paused, initScanner, stopScanner])

  // Handle pause/resume
  React.useEffect(() => {
    if (paused) {
      stopScanner()
    } else if (!scannerRef.current) {
      initScanner()
    }
  }, [paused, stopScanner, initScanner])

  if (!hasCamera) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8 bg-muted rounded-lg', className)}>
        <CameraOff className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-center text-muted-foreground mb-4">
          Camera access is required for QR scanning.
        </p>
        {lastError && (
          <p className="text-sm text-destructive text-center mb-4">{lastError}</p>
        )}
        <Button onClick={restartScanner}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {/* Scanner container */}
      <div
        id={`qr-reader-${scannerId}`}
        className="w-full overflow-hidden rounded-lg bg-black"
        style={{ minHeight: 300 }}
      />

      {/* Status indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full text-white text-sm">
        {isScanning && !paused ? (
          <>
            <Camera className="h-4 w-4 animate-pulse" />
            <span>Scanning...</span>
          </>
        ) : (
          <>
            <CameraOff className="h-4 w-4" />
            <span>Paused</span>
          </>
        )}
      </div>

      {/* Restart button */}
      {!isScanning && !paused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <Button onClick={restartScanner}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Start Camera
          </Button>
        </div>
      )}
    </div>
  )
}
