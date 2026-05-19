import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/Base/Button";
import Table from "@/components/Base/Table";
import TableWrapper from "@/components/TableWrapper";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import {
  deleteNotification,
  fetchNotifications,
  patchNotification,
} from "@/stores/globalNotificationsSlice";
import NotificationForm from "./NotificationForm";
import Lucide from "@/components/Base/Lucide";
import { toast } from "react-toastify";
import { DeleteConfirmationModal } from "@/components/DeleteModal";

const NotificationsManager: React.FC<{ visible: boolean; setVisible: (v: boolean) => void }> = ({
  visible,
  setVisible,
}) => {
  const dispatch: AppDispatch = useAppDispatch();
  const { notifications, loading, initialized } = useAppSelector(
    (s) => (s as any).globalNotifications
  );
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  useEffect(() => {
    if (visible && !initialized) {
      dispatch(fetchNotifications());
    }
  }, [visible, initialized, dispatch]);

  const activeCount = useMemo(
    () => notifications?.filter((item: any) => item.active)?.length || 0,
    [notifications]
  );

  const handleAdd = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleEdit = (item: any) => {
    setEditing(item);
    setShowForm(true);
  };

  const handleDeactivate = async (item: any) => {
    const confirmed = window.confirm(
      "Are you sure you want to deactivate this notification?"
    );
    if (!confirmed) return;

    try {
      await dispatch(
        patchNotification({ id: item.id, data: { active: false } })
      ).unwrap();
      toast.success("Notification deactivated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to deactivate");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;

    try {
      await dispatch(deleteNotification(deleteTarget.id)).unwrap();
      toast.success("Notification deleted");
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="box box--stacked mt-4">
      <div className="flex items-center justify-between gap-4 p-5 border-b border-slate-200/80">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Global Notifications</h3>
          <p className="text-sm text-slate-500">
            Manage all notifications shown on the dashboard.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500 px-3 py-1 rounded-full bg-slate-100">
            Active: {activeCount}/3
          </div>
          <Button variant="primary" onClick={handleAdd}>
            Add Notification
          </Button>
          <Button variant="outline-secondary" onClick={() => setVisible(false)}>
            Hide
          </Button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {showForm && (
          <NotificationForm
            initialData={editing}
            activeCount={activeCount}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onSuccess={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        )}

        <TableWrapper isLoading={loading} rows={5} columns={5}>
          <div className="overflow-auto">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Td className="py-2 font-semibold bg-header text-[#000000B2]">Message</Table.Td>
                  <Table.Td className="py-2 font-semibold bg-header text-[#000000B2]">End Date</Table.Td>
                  <Table.Td className="py-2 font-semibold bg-header text-[#000000B2]">Status</Table.Td>
                  <Table.Td className="py-2 font-semibold bg-header text-[#000000B2]">Created By</Table.Td>
                  <Table.Td className="py-2 font-semibold bg-header text-[#000000B2]">Updated By</Table.Td>
                  <Table.Td className="py-2 font-semibold bg-header text-[#000000B2]">Actions</Table.Td>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {!loading && notifications?.length > 0 ? (
                  notifications.map((item: any) => (
                    <Table.Tr key={item.id}>
                      <Table.Td className="py-3 bg-white border-slate-200/80 max-w-[520px]">
                        <div
                          className="prose max-w-none text-sm text-slate-700 line-clamp-3"
                          dangerouslySetInnerHTML={{
                            __html: item.notification_text || item.text || "",
                          }}
                        />
                      </Table.Td>
                      <Table.Td className="py-3 bg-white border-slate-200/80 whitespace-nowrap">
                        {item.end_date || "N/A"}
                      </Table.Td>
                      <Table.Td className="py-3 bg-white border-slate-200/80 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            item.active
                              ? "bg-success/10 text-success"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {item.active ? "Active" : "Expired"}
                        </span>
                      </Table.Td>
                      <Table.Td className="py-3 bg-white border-slate-200/80">
                        <div className="text-sm text-slate-700">
                            {item.created_by_name || "-"}
                        </div>
                      </Table.Td>
                      <Table.Td className="py-3 bg-white border-slate-200/80">
                        <div className="text-sm text-slate-700">
                          {item.updated_by_name || "-"}
                        </div>
                      </Table.Td>
                      <Table.Td className="py-3 bg-white border-slate-200/80">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            aria-label="Edit notification"
                          >
                            <Lucide icon="PenLine" className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline-secondary"
                            onClick={() => handleDeactivate(item)}
                          >
                            Deactivate
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => setDeleteTarget(item)}
                            aria-label="Delete notification"
                          >
                            <Lucide icon="Trash2" className="w-4 h-4" />
                          </Button>
                        </div>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={6} className="py-10 text-center text-slate-500 bg-white">
                      No notifications found.
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </div>
        </TableWrapper>
      </div>

      <DeleteConfirmationModal
        isVisible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        description="Are you sure you want to delete this notification? This action cannot be undone."
      />
    </div>
  );
};

export default NotificationsManager;
