// hooks/useCleanup.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef } from 'react';
import FirebaseService from '../services/firebaseService';

export const useCleanup = () => {
  const cleanupIntervalRef = useRef<NodeJS.Timeout | number | null>(null);
  
  useEffect(() => {
    // Solo en desarrollo
    if (!__DEV__) return;
    
    // Ejecutar limpieza al iniciar la app (después de 5 segundos)
    const initialCleanup = setTimeout(() => {
      performCleanupIfNeeded();
    }, 5000);
    
    // Ejecutar limpieza cada 4 horas
    cleanupIntervalRef.current = setInterval(() => {
      performCleanupIfNeeded();
    }, 4 * 60 * 60 * 1000); // 4 horas
    
    return () => {
      clearTimeout(initialCleanup);
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, []);
  
  const performCleanupIfNeeded = async () => {
    try {
      // Verificar si ya se hizo limpieza recientemente (últimas 4 horas)
      const lastCleanup = await AsyncStorage.getItem('lastCleanupTime');
      const now = new Date().getTime();
      
      if (lastCleanup) {
        const timeSinceLastCleanup = now - parseInt(lastCleanup);
        const fourHoursInMs = 4 * 60 * 60 * 1000; // 4 horas
        
        if (timeSinceLastCleanup < fourHoursInMs) {
          console.log('⏳ Limpieza reciente (< 4 horas), saltando...');
          return;
        }
      }
      
      console.log('🧹 Ejecutando limpieza automática...');
      const result = await FirebaseService.cleanupInactiveAnonymousUsers();
      
      console.log(`✅ Limpieza completada: ${result.deletedCount} usuarios eliminados`);
      
      // Guardar timestamp de la última limpieza
      await AsyncStorage.setItem('lastCleanupTime', now.toString());
      
    } catch (error) {
      console.log('⚠️ Error en limpieza automática:', error);
    }
  };
  
  // Función manual para testing
  const manualCleanup = async () => {
    if (!__DEV__) {
      console.log('❌ Limpieza manual solo disponible en desarrollo');
      return;
    }
    
    try {
      console.log('🔧 Ejecutando limpieza manual...');
      const result = await FirebaseService.cleanupInactiveAnonymousUsers();
      console.log('✅ Resultado:', result);
      return result;
    } catch (error) {
      console.error('❌ Error en limpieza manual:', error);
      throw error;
    }
  };
  
  return {
    manualCleanup
  };
};