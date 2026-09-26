import React, { useEffect, useState } from "react";
import axiosInstance from "../Api/axios";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import TopBar from "../components/ui/Header/TopBar";

interface HotelType {
    _id?: string;
    hotelName: string;
    city: string;
    distance: string;
    rating: number;
    mapUrl: string;
}

const initialState: HotelType = {
    hotelName: "",
    city: "",
    distance: "0",
    rating: 0,
    mapUrl: "",
};

export default function Hotel() {
    const { user } = useAuth();
    const canView = hasPermission(user, "view_hotels");
    const canAdd = hasPermission(user, "add_hotel");
    const canManage = hasPermission(user, "manage_hotels");
    const [hotels, setHotels] = useState<HotelType[]>([]);
    const [formData, setFormData] = useState<HotelType>(initialState);

    const [loading, setLoading] = useState(false);

    const [editId, setEditId] = useState<string | null>(null);

    // ================= FETCH HOTELS =================

    const fetchHotels = async () => {
        try {
            const res = await axiosInstance.get("/hotels/all");

            setHotels(res.data.data || []);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        if (canView) {
            fetchHotels();
        }
    }, [canView]);

    // ================= HANDLE CHANGE =================

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]:
                [
                    "rating",
                    "buyingPrice",
                    "sellingPrice",
                    "buyingRoe",
                    "sellingRoe",
                ].includes(name)
                    ? Number(value)
                    : value,
        }));
    };

    // ================= CREATE / UPDATE =================

    const handleSubmit = async (
        e: React.FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        const canSave = editId ? canManage : canAdd;
        if (!canSave) {
            alert(editId ? "You don't have permission to update hotels" : "You don't have permission to add hotels");
            return;
        }

        try {
            setLoading(true);

            if (editId) {
                await axiosInstance.put(
                    `/hotels/update/${editId}`,
                    formData
                );

                alert("Hotel updated successfully");
            } else {
                await axiosInstance.post(
                    "/hotels/create",
                    formData
                );

                alert("Hotel created successfully");
            }

            setFormData(initialState);

            setEditId(null);

            fetchHotels();
        } catch (error) {
            console.log(error);
            alert("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    // ================= EDIT =================

    const handleEdit = (hotel: HotelType) => {
        if (!canManage) {
            alert("You don't have permission to manage hotels");
            return;
        }

        setFormData({
            hotelName: hotel.hotelName,
            city: hotel.city,
            distance: hotel.distance,
            rating: hotel.rating,
            mapUrl: hotel.mapUrl
        });

        setEditId(hotel._id || null);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    // ================= DELETE =================

    const handleDelete = async (id?: string) => {
        if (!id) return;

        if (!canManage) {
            alert("You don't have permission to manage hotels");
            return;
        }

        const confirmDelete = window.confirm(
            "Are you sure you want to delete this hotel?"
        );

        if (!confirmDelete) return;

        try {
            await axiosInstance.delete(`/hotels/delete/${id}`);

            alert("Hotel deleted successfully");

            fetchHotels();
        } catch (error) {
            console.log(error);
            alert("Delete failed");
        }
    };

    if (!canView) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm">
                You do not have permission to view Hotels.
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="mx-auto">
                {/* ================= HEADER ================= */}

                <TopBar title="Add Hotels" description="Add and Manage your Hotels here for umrah packages." />
                {/* ================= FORM ================= */}

                <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
                    <h2 className="text-2xl font-semibold mb-5">
                        {editId ? "Update Hotel" : "Add Hotel"}
                    </h2>

                    <form
                        onSubmit={handleSubmit}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                    >
                        {/* HOTEL NAME */}

                        <div>
                            <label className="block mb-2 font-medium">
                                Hotel Name
                            </label>

                            <input
                                type="text"
                                name="hotelName"
                                value={formData.hotelName}
                                onChange={handleChange}
                                placeholder="Type hotel..."
                                required
                                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* CITY */}

                        <div>
                            <label className="block mb-2 font-medium">
                                City
                            </label>

                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                placeholder="Type city..."
                                required
                                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* DISTANCE */}

                        <div>
                            <label className="block mb-2 font-medium">
                                Distance (m)
                            </label>

                            <input
                                type="text"
                                name="distance"
                                value={formData.distance}
                                onChange={handleChange}
                                placeholder="500"
                                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* RATING */}

                        <div>
                            <label className="block mb-2 font-medium">
                                Rating
                            </label>

                            <input
                                type="number"
                                name="rating"
                                value={formData.rating}
                                onChange={handleChange}
                                placeholder="5"
                                min={0}
                                max={5}
                                step="0.1"
                                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* MAP URL */}

                        <div className="md:col-span-2">
                            <label className="block mb-2 font-medium">
                                Map URL
                            </label>

                            <input
                                type="text"
                                name="mapUrl"
                                value={formData.mapUrl}
                                onChange={handleChange}
                                placeholder="Google map link..."
                                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* BUTTONS */}

                        <div className="flex items-end gap-3 md:col-span-2 lg:col-span-3">
                            <button
                                type="submit"
                                disabled={loading || (editId ? !canManage : !canAdd)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title={editId ? (!canManage ? "You don't have permission to update hotels" : "") : (!canAdd ? "You don't have permission to add hotels" : "")}
                            >
                                {loading
                                    ? "Please wait..."
                                    : editId
                                        ? "Update Hotel"
                                        : "Add Hotel"}
                            </button>

                            {editId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditId(null);
                                        setFormData(initialState);
                                    }}
                                    className="bg-gray-300 hover:bg-gray-400 text-black px-6 py-3 rounded-xl font-medium transition"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* ================= TABLE ================= */}

                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                    <div className="p-5 border-b">
                        <h2 className="text-2xl font-semibold">
                            All Hotels
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="text-left p-4">
                                        Hotel
                                    </th>

                                    <th className="text-left p-4">
                                        City
                                    </th>

                                    <th className="text-left p-4">
                                        Distance
                                    </th>

                                    <th className="text-left p-4">
                                        Rating
                                    </th>

                                    <th className="text-left p-4">
                                        Map
                                    </th>

                                    <th className="w-40 text-center p-4">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {hotels.length > 0 ? (
                                    hotels.map((hotel) => (
                                        <tr
                                            key={hotel._id}
                                            className="border-b hover:bg-gray-50"
                                        >
                                            <td className="p-4 font-medium">
                                                {hotel.hotelName}
                                            </td>

                                            <td className="p-4">
                                                {hotel.city}
                                            </td>

                                            <td className="p-4">
                                                {hotel.distance}
                                            </td>

                                            <td className="p-4">
                                                ⭐ {hotel.rating}
                                            </td>

                                            <td className="p-4">
                                                {hotel.mapUrl ? (
                                                    <a
                                                        href={hotel.mapUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-blue-600 underline"
                                                    >
                                                        Open Map
                                                    </a>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>

                                            <td className="p-4">
                                                <div className="flex justify-center gap-3">
                                                    <button
                                                        onClick={() =>
                                                            handleEdit(hotel)
                                                        }
                                                        disabled={!canManage}
                                                        className="bg-yellow-400 hover:bg-yellow-500 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={!canManage ? "You don't have permission to manage hotels" : ""}
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        onClick={() =>
                                                            handleDelete(hotel._id)
                                                        }
                                                        disabled={!canManage}
                                                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={!canManage ? "You don't have permission to manage hotels" : ""}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="text-center p-10 text-gray-500"
                                        >
                                            No hotels found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
