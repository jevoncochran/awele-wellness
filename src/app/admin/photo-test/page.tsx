import PhotoField from "@/app/admin/PhotoField";
import { requireAdmin } from "@/lib/admin-auth";

// TEMPORARY: lets us try the photo upload before the Add form exists. Deleted
// again before this step is finished.
export default async function PhotoTestPage() {
  await requireAdmin();
  return (
    <main className="p-10">
      <form id="photo-test-form">
        <PhotoField name="image" />
      </form>
    </main>
  );
}
