import { useEffect } from 'react';

export function useInfiniteScroll(callback: () => void, targetRef: any) {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) callback();
    });
    if (targetRef.current) observer.observe(targetRef.current);
    return () => observer.disconnect();
  }, [callback, targetRef]);
}
