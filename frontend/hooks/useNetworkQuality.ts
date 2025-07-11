import { useState, useEffect, useCallback } from 'react';

export interface NetworkQualityData {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // milliseconds
  saveData: boolean;
  quality: 'poor' | 'moderate' | 'good' | 'excellent' | 'unknown';
}

/**
 * Hook to detect network connection quality for adaptive loading
 * Uses Navigator.connection API when available, falls back to heuristics
 */
export function useNetworkQuality() {
  const [networkData, setNetworkData] = useState<NetworkQualityData>({
    effectiveType: 'unknown',
    downlink: 10, // Default to moderate speed
    rtt: 100,
    saveData: false,
    quality: 'good', // Default to good quality
  });

  const determineQuality = useCallback((data: Partial<NetworkQualityData>): NetworkQualityData['quality'] => {
    const { effectiveType, downlink = 10, rtt = 100 } = data;

    // If save-data is enabled, consider as poor quality
    if (data.saveData) return 'poor';

    // Use effective type if available
    if (effectiveType) {
      switch (effectiveType) {
        case 'slow-2g':
          return 'poor';
        case '2g':
          return 'poor';
        case '3g':
          return 'moderate';
        case '4g':
          return downlink > 5 ? 'excellent' : 'good';
        default:
          break;
      }
    }

    // Use downlink and RTT as fallback
    if (downlink < 1.5 || rtt > 300) return 'poor';
    if (downlink < 3 || rtt > 200) return 'moderate';
    if (downlink < 10 || rtt > 100) return 'good';
    return 'excellent';
  }, []);

  const updateNetworkInfo = useCallback(() => {
    // Check if Network Information API is supported
    const connection = (navigator as any).connection 
      || (navigator as any).mozConnection 
      || (navigator as any).webkitConnection;

    if (connection) {
      const data = {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
        saveData: connection.saveData || false,
      };

      setNetworkData({
        ...data,
        quality: determineQuality(data),
      });
    } else {
      // Fallback: measure load time heuristics
      measureNetworkSpeed();
    }
  }, [determineQuality]);

  const measureNetworkSpeed = useCallback(async () => {
    try {
      const startTime = performance.now();
      
      // Use a small image from the same domain to test speed
      // This is a lightweight test that doesn't impact user experience
      const testImage = new Image();
      const imagePromise = new Promise<void>((resolve, reject) => {
        testImage.onload = () => resolve();
        testImage.onerror = () => reject();
      });

      // Use a data URI for consistent testing
      testImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      
      await imagePromise;
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Estimate quality based on load time
      let quality: NetworkQualityData['quality'] = 'unknown';
      if (loadTime < 50) quality = 'excellent';
      else if (loadTime < 100) quality = 'good';
      else if (loadTime < 200) quality = 'moderate';
      else quality = 'poor';

      setNetworkData(prev => ({
        ...prev,
        quality,
        rtt: Math.min(loadTime * 2, 500), // Estimate RTT
      }));
    } catch {
      // If measurement fails, assume moderate quality
      setNetworkData(prev => ({
        ...prev,
        quality: 'moderate',
      }));
    }
  }, []);

  useEffect(() => {
    // Initial measurement
    updateNetworkInfo();

    // Listen for connection changes
    const connection = (navigator as any).connection;
    if (connection && 'addEventListener' in connection) {
      connection.addEventListener('change', updateNetworkInfo);
      
      return () => {
        connection.removeEventListener('change', updateNetworkInfo);
      };
    }

    // Periodic re-measurement for non-supporting browsers
    const interval = setInterval(measureNetworkSpeed, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [updateNetworkInfo, measureNetworkSpeed]);

  // Helper functions for easy consumption
  const getPreloadStrategy = useCallback(() => {
    switch (networkData.quality) {
      case 'poor':
        return {
          preloadDistance: 300,
          maxPreloadPages: 1,
          chunkSize: 10,
        };
      case 'moderate':
        return {
          preloadDistance: 600,
          maxPreloadPages: 2,
          chunkSize: 15,
        };
      case 'good':
        return {
          preloadDistance: 800,
          maxPreloadPages: 3,
          chunkSize: 20,
        };
      case 'excellent':
        return {
          preloadDistance: 1200,
          maxPreloadPages: 4,
          chunkSize: 25,
        };
      default:
        return {
          preloadDistance: 600,
          maxPreloadPages: 2,
          chunkSize: 15,
        };
    }
  }, [networkData.quality]);

  return {
    networkData,
    getPreloadStrategy,
    isPoorConnection: networkData.quality === 'poor',
    isGoodConnection: ['good', 'excellent'].includes(networkData.quality),
    shouldReducePreloading: ['poor', 'moderate'].includes(networkData.quality) || networkData.saveData,
  };
} 