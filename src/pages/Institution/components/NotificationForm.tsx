import React, { useEffect } from "react";
import dayjs from "dayjs";
import Button from "@/components/Base/Button";
import { Controller, useForm } from "react-hook-form";
import { ClassicEditor } from "@/components/Base/Ckeditor";
import Litepicker from "@/components/Base/Litepicker";
import { FormSwitch } from "@/components/Base/Form";
import { useAppDispatch } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import {
  createNotification,
  updateNotification,
} from "@/stores/globalNotificationsSlice";
import { toast } from "react-toastify";

interface Props {
  initialData?: any | null;
  activeCount: number;
  onCancel: () => void;
  onSuccess?: () => void;
}

const NotificationForm: React.FC<Props> = ({
  initialData = null,
  activeCount,
  onCancel,
  onSuccess = () => {},
}) => {
  const dispatch: AppDispatch = useAppDispatch();
  const isEdit = !!initialData?.id;
  const activeLimitReached = activeCount >= 3;

  const { control, handleSubmit, reset, formState: { errors } } = useForm<any>({
    defaultValues: {
      notification_text: initialData?.notification_text || initialData?.text || "",
      end_date: initialData?.end_date || "",
      active:
        initialData?.active !== undefined
          ? initialData.active
          : activeLimitReached
            ? false
            : true,
    },
  });

  useEffect(() => {
    reset({
      notification_text: initialData?.notification_text || initialData?.text || "",
      end_date: initialData?.end_date || "",
      active:
        initialData?.active !== undefined
          ? initialData.active
          : activeLimitReached
            ? false
            : true,
    });
  }, [initialData, activeLimitReached, reset]);

  const onSubmit = async (data: any) => {
    try {
      if (!isEdit && activeLimitReached && data.active) {
        toast.error("Maximum 3 active notifications are allowed. Deactivate one first.");
        return;
      }

      if (initialData && initialData.id) {
        await dispatch(updateNotification({ id: initialData.id, data })).unwrap();
        toast.success("Notification updated");
      } else {
        await dispatch(createNotification(data)).unwrap();
        toast.success("Notification created");
      }

      onCancel();
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save notification");
    }
  };

  return (
    <div className="border border-slate-200 rounded-md bg-slate-50/60 p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">
            {isEdit ? "Edit Notification" : "Add Notification"}
          </h3>
          {activeLimitReached && !isEdit && (
            <p className="text-xs text-amber-600 mt-1">
              Maximum 3 active notifications are allowed. New notifications can still be saved as inactive.
            </p>
          )}
        </div>
        <Button variant="outline-secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        
        <div>
          <label className="block mb-2 font-semibold text-slate-700">Message</label>
          <Controller
            name="notification_text"
            control={control}
            rules={{ required: "Message is required" }}
            render={({ field }) => (
              <>
                <ClassicEditor value={field.value} onChange={(e) => field.onChange(e)} />
                {errors.notification_text && (
                  <div className="text-sm text-rose-600 mt-1">{(errors.notification_text as any).message}</div>
                )}
              </>
            )}
          />
        </div>

        <div>
          <label className="block mb-2 font-semibold text-slate-700">End Date</label>
          <Controller
            name="end_date"
            control={control}
            rules={{
              required: "End date is required",
              validate: (val: string) => {
                if (!val) return true;
                const picked = dayjs(val);
                return (picked.isValid() && picked.isAfter(dayjs())) || "End date must be in the future";
              },
            }}
            render={({ field }) => (
              <>
                <Litepicker
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  options={{
                    singleMode: true,
                    format: "YYYY-MM-DD HH:mm",
                    showTime: true,
                    minDate: dayjs().toDate(),
                  } as any}
                  className="w-full"
                />
                {errors.end_date && (
                  <div className="text-sm text-rose-600 mt-1">{(errors.end_date as any).message}</div>
                )}
              </>
            )}
          />
        </div>

        <div className="flex items-center gap-3">
          <Controller
            name="active"
            control={control}
            render={({ field }) => (
              <FormSwitch>
                <FormSwitch.Input
                  id="notification-active"
                  type="checkbox"
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  disabled={!isEdit && activeLimitReached}
                />
                <FormSwitch.Label htmlFor="notification-active" className="ml-3">
                  Active
                </FormSwitch.Label>
              </FormSwitch>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline-secondary" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NotificationForm;
