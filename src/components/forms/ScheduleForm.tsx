"use client"

import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form"
import { Button } from "../ui/button"
import { DAYS_OF_WEEK_IN_ORDER } from "@/data/constants"
import { scheduleFormSchema } from "@/schema/schedule"
import { timeToInt } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"
import { formatTimezoneOffset } from "@/lib/formatters"
import { Fragment, useEffect, useState } from "react"
import { Plus, X } from "lucide-react"
import { Input } from "../ui/input"
import { saveSchedule } from "@/server/actions/schedule"
import { convertFromUTC, convertToUTC, formatInTimezone } from "@/lib/timezone"
import { toZonedTime } from "date-fns-tz"
<<<<<<< HEAD
=======
import { formatInTimeZone } from "date-fns-tz"
>>>>>>> 8e67176 (Revert commit db7e57fd39512f6d918fcdbd2e2cefb6a8d71210)

type Availability = {
  startTime: string
  endTime: string
  dayOfWeek: (typeof DAYS_OF_WEEK_IN_ORDER)[number]
}

export function ScheduleForm({
  schedule,
}: {
  schedule?: {
    timezone: string
    availabilities: Availability[]
  }
}) {
  const [successMessage, setSuccessMessage] = useState<string>()
  const [errorMessage, setErrorMessage] = useState<string>()
  const form = useForm<z.infer<typeof scheduleFormSchema>>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      timezone:
        schedule?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      availabilities: schedule?.availabilities.toSorted((a, b) => {
        return timeToInt(a.startTime) - timeToInt(b.startTime)
      }),
    },
  })

  const {
    append: addAvailability,
    remove: removeAvailability,
    fields: availabilityFields,
    update: updateAvailability,
  } = useFieldArray({ name: "availabilities", control: form.control })

  const groupedAvailabilityFields = Object.groupBy(
    availabilityFields.map((field, index) => ({ ...field, index })),
    availability => availability.dayOfWeek
  )

  // Handle timezone changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "timezone" && value.timezone) {
        // Convert all times to the new timezone
        const newTimezone = value.timezone
        const oldTimezone = schedule?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

        if (oldTimezone !== newTimezone) {
          const date = new Date()
          value.availabilities?.forEach((availability, index) => {
            if (availability && availability.dayOfWeek) {
              // Create a date object in the old timezone
<<<<<<< HEAD
              const oldStartTime = new Date(`${date.toISOString().split('T')[0]}T${availability.startTime}`)
              const oldEndTime = new Date(`${date.toISOString().split('T')[0]}T${availability.endTime}`)

              // Convert to the new timezone
              const newStartTime = new Date(oldStartTime.toLocaleString('en-US', { timeZone: newTimezone }))
              const newEndTime = new Date(oldEndTime.toLocaleString('en-US', { timeZone: newTimezone }))

              updateAvailability(index, {
                dayOfWeek: availability.dayOfWeek,
                startTime: formatInTimezone(newStartTime, newTimezone, 'HH:mm'),
                endTime: formatInTimezone(newEndTime, newTimezone, 'HH:mm'),
=======
              const oldStartTime = toZonedTime(new Date(`${date.toISOString().split('T')[0]}T${availability.startTime}`), oldTimezone)
              const oldEndTime = toZonedTime(new Date(`${date.toISOString().split('T')[0]}T${availability.endTime}`), oldTimezone)

              // Convert to the new timezone
              const newStartTime = formatInTimeZone(oldStartTime, newTimezone, 'HH:mm')
              const newEndTime = formatInTimeZone(oldEndTime, newTimezone, 'HH:mm')

              updateAvailability(index, {
                dayOfWeek: availability.dayOfWeek,
                startTime: newStartTime,
                endTime: newEndTime,
>>>>>>> 8e67176 (Revert commit db7e57fd39512f6d918fcdbd2e2cefb6a8d71210)
              })
            }
          })
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [form, schedule?.timezone, updateAvailability])

  async function onSubmit(values: z.infer<typeof scheduleFormSchema>) {
    setErrorMessage(undefined)
    setSuccessMessage(undefined)
    
    const data = await saveSchedule(values)

    if (data?.error) {
      setErrorMessage(data.message || "There was an error saving your schedule")
      form.setError("root", {
        message: data.message || "There was an error saving your schedule",
      })
    } else {
      setSuccessMessage("Schedule saved!")
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex gap-6 flex-col"
      >
        {form.formState.errors.root && (
          <div className="text-destructive text-sm">
            {form.formState.errors.root.message}
          </div>
        )}
        {errorMessage && (
          <div className="text-destructive text-sm">{errorMessage}</div>
        )}
        {successMessage && (
          <div className="text-green-500 text-sm">{successMessage}</div>
        )}
        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Intl.supportedValuesOf("timeZone").map(timezone => (
                    <SelectItem key={timezone} value={timezone}>
                      {timezone}
                      {` (${formatTimezoneOffset(timezone)})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                All times will be converted to this timezone
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-[auto,1fr] gap-y-6 gap-x-4">
          {DAYS_OF_WEEK_IN_ORDER.map(dayOfWeek => (
            <Fragment key={dayOfWeek}>
              <div className="capitalize text-sm font-semibold">
                {dayOfWeek.substring(0, 3)}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  className="size-6 p-1"
                  variant="outline"
                  onClick={() => {
                    addAvailability({
                      dayOfWeek,
                      startTime: "9:00",
                      endTime: "17:00",
                    })
                  }}
                >
                  <Plus className="size-full" />
                </Button>
                {groupedAvailabilityFields[dayOfWeek]?.map(
                  (field, labelIndex) => (
                    <div className="flex flex-col gap-1" key={field.id}>
                      <div className="flex gap-2 items-center">
                        <FormField
                          control={form.control}
                          name={`availabilities.${field.index}.startTime`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  className="w-24"
                                  aria-label={`${dayOfWeek} Start Time ${
                                    labelIndex + 1
                                  }`}
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        -
                        <FormField
                          control={form.control}
                          name={`availabilities.${field.index}.endTime`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  className="w-24"
                                  aria-label={`${dayOfWeek} End Time ${
                                    labelIndex + 1
                                  }`}
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          className="size-6 p-1"
                          variant="destructiveGhost"
                          onClick={() => removeAvailability(field.index)}
                        >
                          <X />
                        </Button>
                      </div>
                      <FormMessage>
                        {
                          form.formState.errors.availabilities?.at?.(
                            field.index
                          )?.root?.message
                        }
                      </FormMessage>
                      <FormMessage>
                        {
                          form.formState.errors.availabilities?.at?.(
                            field.index
                          )?.startTime?.message
                        }
                      </FormMessage>
                      <FormMessage>
                        {
                          form.formState.errors.availabilities?.at?.(
                            field.index
                          )?.endTime?.message
                        }
                      </FormMessage>
                    </div>
                  )
                )}
              </div>
            </Fragment>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <Button disabled={form.formState.isSubmitting} type="submit">
            Save
          </Button>
        </div>
      </form>
    </Form>
  )
}
