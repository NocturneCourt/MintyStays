export default function Loading() {
  return (
    <main id="main-content" className="app-shell loading-shell" aria-busy="true">
      <div className="loading-topbar" />
      <div className="loading-explorer">
        <div className="loading-map" />
        <div className="loading-list">
          <div className="loading-block loading-filter" />
          <div className="loading-block loading-heading" />
          <div className="loading-card" />
          <div className="loading-card" />
          <div className="loading-card" />
        </div>
      </div>
      <p className="sr-only">Loading cold stays</p>
    </main>
  );
}
