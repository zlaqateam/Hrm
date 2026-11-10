// Re-mounts on every navigation inside the app, giving each page a soft entrance.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-up">{children}</div>;
}
