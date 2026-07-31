import CollectionPage from "./CollectionPage.jsx";

export default function Liked() {
  return (
    <CollectionPage
      collection="likes"
      title="Liked Movies"
      icon="♥"
      emptyMsg="Tap the heart on any poster to save it here. Your likes follow you across every device."
    />
  );
}
