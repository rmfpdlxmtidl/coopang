'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChangeEvent, memo, useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { NumericFormat } from 'react-number-format'

import { Product, ProductPlaceholder } from '../common/model'
import { fetchWithJWT, formatKoreaPrice, toastError } from '../common/utils'
import LoadingSpinner from '../components/LoadingSpinner'
import useCurrentUser from '../hooks/useCurrentUser'
import XIcon from '../svgs/x.svg'

type Props = {
  product: ProductPlaceholder
}

type Condition = {
  prices: Price[]
  hasCardDiscount: boolean
  hasCouponDiscount: boolean
  canBuy: boolean
}

type Price = {
  limit: number
  fluctuation: 'more' | 'less'
  unit: number
}

export default memo(NotificationForm)

function NotificationForm({ product }: Props) {
  const condition = product.notificationCondition
  const { isPlaceholder } = product
  const user = useCurrentUser()

  // Notification subscription inputs
  const {
    control,
    formState: { isDirty },
    handleSubmit,
    setValue,
    watch,
  } = useForm<Condition>({
    defaultValues: {
      prices: [],
      hasCardDiscount: condition?.hasCardDiscount ?? false,
      hasCouponDiscount: condition?.hasCouponDiscount ?? false,
      canBuy: condition?.canBuy ?? false,
    },
  })

  const setValueDirty = (
    name: Parameters<typeof setValue>[0],
    value: Parameters<typeof setValue>[1]
  ) => setValue(name, value, { shouldDirty: true })

  const hasCardDiscount = watch('hasCardDiscount')
  const hasCouponDiscount = watch('hasCouponDiscount')
  const canBuy = watch('canBuy')

  const {
    fields: prices,
    append,
    remove,
  } = useFieldArray({
    control,
    name: 'prices',
  })

  const isConditionEmpty = prices.length === 0 && !hasCardDiscount && !hasCouponDiscount && !canBuy

  // Price limit condition
  const limitInput = useRef<HTMLInputElement>(null)
  const unitInput = useRef<HTMLInputElement>(null)

  function createPriceNotification(e: ChangeEvent<HTMLSelectElement>) {
    if (!limitInput.current || !unitInput.current) return

    const limit = +limitInput.current.value.replaceAll(',', '')
    const unit = +unitInput.current.value.replaceAll(',', '')
    const fluctuation = e.target.value as 'more' | 'less'
    e.target.value = ''

    if (!limit) {
      return toast.error('???????????? ??????????????????')
    } else if (!unit) {
      return toast.error('????????? ??????????????????')
    } else if (unit < 100) {
      return toast.error('????????? 100??? ???????????????')
    } else if (unit % 100 !== 0) {
      return toast.error('????????? 100??? ????????? ??????????????????')
    } else if (
      prices.some((p) => p.limit === +limit && p.unit === +unit && p.fluctuation === fluctuation)
    ) {
      return toast.error('?????? ?????? ????????? ????????? ???????????????')
    }

    append({ limit: +limit, unit: +unit, fluctuation })
  }

  // Other condition
  const [notificationType, setNotificationType] = useState('price')

  function createCondition(e: ChangeEvent<HTMLSelectElement>) {
    setNotificationType(e.target.value)

    switch (e.target.value) {
      case 'price':
        break
      case 'card-discount':
        setValueDirty('hasCardDiscount', true)
        break
      case 'coupon-discount':
        setValueDirty('hasCouponDiscount', true)
        break
      case 'out-of-order':
        setValueDirty('canBuy', true)
        break
      default:
        break
    }
  }

  // Toggle notification condition
  const queryClient = useQueryClient()

  const {
    isLoading: isSubscriptionLoading,
    isError: isSubscriptionError,
    mutate,
  } = useMutation<any, any, any>({
    mutationFn: ({ productId, condition }) =>
      fetchWithJWT(`/product/${productId}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: condition ? JSON.stringify(condition) : null,
      }),
    onError: toastError,
    onSuccess: (_, { condition }) =>
      queryClient.setQueryData<Product>(
        ['product', product.URL],
        (oldData) => oldData && { ...oldData, condition }
      ),
  })

  function toggleSubscription(condition: Condition) {
    if (user)
      mutate({
        productId: product.id,
        condition: isConditionEmpty ? null : condition,
      })
  }

  // Style
  const isPlaceholderStyle = isPlaceholder ? 'border-slate-200 bg-slate-50' : 'border-transparent'

  return (
    <form
      className={`mx-2 my-8 border-2 ${isPlaceholderStyle} md:mx-0`}
      onSubmit={handleSubmit(toggleSubscription)}
    >
      {isPlaceholder && <h3 className="border-b-2 border-slate-200 text-center p-2">?????? ??????</h3>}
      <div className="flex gap-2 items-center my-4 whitespace-nowrap flex-wrap">
        <select
          className="p-2 border w-28 focus:outline-fox-600 cursor-pointer"
          onChange={createCondition}
        >
          <option value="price">?????? ?????????</option>
          <option value="card-discount">?????? ?????????</option>
          <option value="coupon-discount">?????? ?????????</option>
          <option value="out-of-order">????????? ?????????</option>
        </select>
        {notificationType === 'price' ? (
          <>
            <div className="flex gap-2 items-center">
              <NumericFormat
                customInput={(props) => (
                  <input
                    className="border p-2 w-32 focus:outline-fox-600"
                    inputMode="numeric"
                    placeholder="?????????"
                    ref={limitInput}
                    {...props}
                  />
                )}
                isAllowed={({ value }) => {
                  if (+value < 0) {
                    toast.error('???????????? 0??? ????????? ??? ????????????')
                    return false
                  } else if (+value > 1_000_000_000) {
                    toast.error('???????????? 10????????? ????????? ??? ????????????')
                    return false
                  }
                  return true
                }}
                thousandsGroupStyle="thousand"
                thousandSeparator=","
              />
              <span>?????????</span>
            </div>
            <div className="flex gap-2 items-center">
              <NumericFormat
                customInput={(props) => (
                  <input
                    className="border p-2 w-24 focus:outline-fox-600"
                    inputMode="numeric"
                    placeholder="??????"
                    ref={unitInput}
                    {...props}
                  />
                )}
                isAllowed={({ value }) => {
                  if (+value >= 10_000_000) {
                    toast.error('????????? 1????????? ????????? ??? ????????????')
                    return false
                  }
                  return true
                }}
                thousandsGroupStyle="thousand"
                thousandSeparator=","
              />
              <span>??????</span>
            </div>
            <div className="flex gap-2 items-center">
              <select
                className="p-2 border w-20 focus:outline-fox-600 cursor-pointer"
                defaultValue=""
                name="fluctuation"
                onChange={createPriceNotification}
              >
                <option disabled value="">
                  (??????)
                </option>
                <option value="more">??????</option>
                <option value="less">??????</option>
              </select>
              <span>??? ?????????</span>
            </div>
          </>
        ) : notificationType === 'card-discount' || notificationType === 'coupon-discount' ? (
          <span>????????? ????????? ???</span>
        ) : notificationType === 'out-of-order' ? (
          <span>??????????????? ???</span>
        ) : (
          <span>???</span>
        )}
      </div>

      {!isConditionEmpty && (
        <ul className="my-4 grid gap-2">
          {prices.map((price, i) => (
            <li
              key={price.id}
              className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-100"
              onClick={() => remove(i)}
            >
              <XIcon width="1rem" />
              <div>
                ?????? ????????? {formatKoreaPrice(price.limit)}????????? {formatKoreaPrice(price.unit)}??????{' '}
                {price.fluctuation === 'more' ? '??????' : '??????'}??? ?????????
              </div>
            </li>
          ))}
          {hasCardDiscount && (
            <li
              className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-100"
              onClick={() => setValueDirty('hasCardDiscount', false)}
            >
              <XIcon width="1rem" />
              <div>?????? ????????? ????????? ????????? ???</div>
            </li>
          )}
          {hasCouponDiscount && (
            <li
              className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-100"
              onClick={() => setValueDirty('hasCouponDiscount', false)}
            >
              <XIcon width="1rem" />
              <div>?????? ????????? ????????? ????????? ???</div>
            </li>
          )}
          {canBuy && (
            <li
              className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-100"
              onClick={() => setValueDirty('canBuy', false)}
            >
              <XIcon width="1rem" />
              <div>????????? ????????? ??????????????? ???</div>
            </li>
          )}
        </ul>
      )}

      <div className="p-2">
        <button
          className="bg-fox-700 rounded p-2 w-full text-white font-semibold text-xl disabled:bg-slate-300 disabled:cursor-not-allowed"
          disabled={isPlaceholder || !isDirty || isSubscriptionLoading}
          type="submit"
        >
          <div className="flex gap-2 justify-center items-center">
            {isSubscriptionLoading && <LoadingSpinner />}
            <div>{isConditionEmpty ? '????????????' : '????????????'}</div>
          </div>
        </button>
      </div>
    </form>
  )
}
