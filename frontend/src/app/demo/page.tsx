import { MeshGradientSVG } from "@/components/ui/shader-svg";
import PopoverInfo from "@/components/ui/popover-info";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          Component Demo
        </h1>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Mesh Gradient SVG
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <MeshGradientSVG />
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Popover Info
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Click the info button:
            </p>
            <PopoverInfo />
          </div>
        </section>
      </div>
    </div>
  );
}
