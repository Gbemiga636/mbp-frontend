'use client';

import styles from './PageIntro.module.css';


export function PageIntro({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={styles.intro}>
      <p>{kicker}</p>
      <h1 className="display h2">{title}</h1>
      {children ? <div className={styles.lead}>{children}</div> : null}
    </header>
  );
}
