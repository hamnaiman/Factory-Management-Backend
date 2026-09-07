import { useEffect, useState } from "react";
import { X } from "lucide-react";

function LabourModal({
  open,
  onClose,
  onSubmit,
  initialData,
}) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    cnic: "",
    department: "Production",
    dailyWage: "",
    status: "active",
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: "",
        phone: "",
        cnic: "",
        department: "Production",
        dailyWage: "",
        status: "active",
      });
    }
  }, [initialData]);

  if (!open) return null;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

const handleSubmit = (e) => {
  e.preventDefault();

  const payload = { ...formData };

  // Agar CNIC empty hai to field remove kar do
  if (!payload.cnic || payload.cnic.trim() === "") {
    delete payload.cnic;
  }

  onSubmit(payload);
};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

      <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-xl">

        {/* Header */}

        <div className="mb-8 flex items-center justify-between">

          <div>

            <h2 className="text-2xl font-bold">
              {initialData ? "Edit Worker" : "Add Worker"}
            </h2>

            <p className="text-slate-500">
              Fill worker information.
            </p>

          </div>

          <button onClick={onClose}>
            <X />
          </button>

        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-2 gap-5"
        >

          <input
            name="name"
            placeholder="Worker Name"
            value={formData.name}
            onChange={handleChange}
            className="h-12 rounded-xl border px-4"
            required
          />

          <input
            name="phone"
            placeholder="Phone"
            value={formData.phone}
            onChange={handleChange}
            className="h-12 rounded-xl border px-4"
            required
          />

          <input
            name="cnic"
            placeholder="CNIC"
            value={formData.cnic}
            onChange={handleChange}
            className="h-12 rounded-xl border px-4"
          />

          <input
            name="dailyWage"
            type="number"
            placeholder="Daily Wage"
            value={formData.dailyWage}
            onChange={handleChange}
            className="h-12 rounded-xl border px-4"
            required
          />

          <select
            name="department"
            value={formData.department}
            onChange={handleChange}
            className="h-12 rounded-xl border px-4"
          >
            <option>Production</option>
            <option>Packing</option>
            <option>Warehouse</option>
            <option>Loading</option>
            <option>Office</option>
          </select>

          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="h-12 rounded-xl border px-4"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <div className="col-span-2 mt-4 flex justify-end gap-3">

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border px-6 py-3"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-xl bg-[#1E3A8A] px-6 py-3 text-white"
            >
              {initialData ? "Update Worker" : "Save Worker"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default LabourModal;