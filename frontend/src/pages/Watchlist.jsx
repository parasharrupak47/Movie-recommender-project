import CollectionPage from "./CollectionPage.jsx";

export default function Watchlist() {
  return (
    <CollectionPage
      collection="watchlist"
      title="My Watchlist"
      icon="🔖"
      emptyMsg="Movies you add to your watchlist will show up here, saved to your account across every device."
    />
  );
}
