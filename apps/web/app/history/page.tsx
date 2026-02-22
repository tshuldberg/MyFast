export default function HistoryPage(): React.JSX.Element {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>History</h1>
      <p style={{ color: '#9B92A8', marginTop: 8 }}>No fasts recorded yet</p>
    </main>
  );
}
