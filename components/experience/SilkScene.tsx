'use client';

import { useEffect, useRef } from 'react';

export function SilkScene({ className }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let dispose = () => {};
    let cancelled = false;

    (async () => {
      const THREE = await import('three');
      if (cancelled || !el) return;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
      renderer.setSize(el.clientWidth, el.clientHeight);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, el.clientWidth / Math.max(el.clientHeight, 1), 0.1, 80);
      camera.position.set(0, 0, 7.2);

      const geo = new THREE.PlaneGeometry(14, 9, 96, 64);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xc4a574,
        metalness: 0.62,
        roughness: 0.22,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
      });
      const silk = new THREE.Mesh(geo, mat);
      silk.rotation.x = -0.42;
      silk.rotation.y = -0.18;
      scene.add(silk);

      const veil = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 10, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0xf4eadc, transparent: true, opacity: 0.08, side: THREE.DoubleSide })
      );
      veil.position.z = -1.4;
      scene.add(veil);

      scene.add(new THREE.AmbientLight(0xfff4e6, 0.85));
      const key = new THREE.DirectionalLight(0xffe7c2, 1.6);
      key.position.set(3.2, 4.2, 5);
      scene.add(key);
      const rim = new THREE.PointLight(0x8d6a38, 22, 28);
      rim.position.set(-4, -1.4, 3);
      scene.add(rim);
      const wash = new THREE.PointLight(0xfff8ee, 10, 24);
      wash.position.set(1.5, 2.4, 4);
      scene.add(wash);

      const pos = geo.attributes.position;
      const base = Float32Array.from(pos.array as ArrayLike<number>);
      let scroll = 0;
      const onScroll = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        scroll = max > 0 ? window.scrollY / max : 0;
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });

      let frame = 0;
      let raf = 0;
      const tick = () => {
        frame += 0.0105;
        for (let i = 0; i < pos.count; i++) {
          const x = base[i * 3];
          const y = base[i * 3 + 1];
          const wave =
            Math.sin(x * 0.55 + frame + scroll * 7.2) * 0.32 +
            Math.cos(y * 0.82 + frame * 0.72) * 0.2 +
            Math.sin((x + y) * 0.28 + scroll * 4) * 0.12;
          pos.setZ(i, wave);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        silk.rotation.z = -0.1 + scroll * 0.46;
        silk.rotation.y = -0.22 + scroll * 0.7;
        silk.position.y = scroll * 0.85;
        camera.position.x = Math.sin(scroll * Math.PI) * 0.35;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      tick();

      const onResize = () => {
        const w = el.clientWidth;
        const h = Math.max(el.clientHeight, 1);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', onResize);

      dispose = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
        geo.dispose();
        mat.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch(() => null);

    return () => {
      cancelled = true;
      dispose();
    };
  }, []);

  return <div ref={wrap} className={className} aria-hidden />;
}
