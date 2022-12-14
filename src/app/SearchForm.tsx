'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'

import { Product, ProductPlaceholder, productPlaceholder } from '../common/model'
import { fetchWithJWT, formatKoreaPrice, toastError } from '../common/utils'
import LoadingSpinner from '../components/LoadingSpinner'
import NotificationForm from './NotificationForm'
import SearchResult from './SearchResult'

type Form = {
  url: string
}

export default function SearchForm() {
  // Form
  const validURL = getValidURL(useSearchParams().get('url'))
  const {
    formState: { errors, isDirty },
    handleSubmit,
    register,
  } = useForm<Form>({
    defaultValues: { url: validURL },
    delayError: 500,
  })

  // Query
  const [enabled, setEnabled] = useState(Boolean(validURL))
  const [encodedURL, setEncodedURL] = useState(encodeURIComponent(validURL))

  const {
    data: product,
    error,
    isFetching,
  } = useQuery<Product>({
    queryKey: ['product', encodedURL],
    queryFn: async ({ signal }) => fetchWithJWT(`/product?url=${encodedURL}`, { signal }),
    enabled,
    placeholderData: productPlaceholder,
    keepPreviousData: true,
    onError: (error) => {
      setEnabled(false)
      toastError(error as Error)
    },
    onSuccess: () => setEnabled(false),
    retry: false,
  })

  const queryClient = useQueryClient()

  function searchProduct({ url }: Form) {
    const encodedURL = encodeURIComponent(getValidURL(url))

    if (isFetching) {
      queryClient.cancelQueries({ queryKey: ['product', encodedURL] })
      setEnabled(false)
    } else {
      setEnabled(true)
      setEncodedURL(encodedURL)
    }
  }

  // Share
  function shareWithKakaotalk() {
    if (!product) return

    const sharingProduct = product.isPlaceholder ? productPlaceholder : product
    const { updateTime, URL, originalPrice, minimumPrice, imageURL } = sharingProduct

    const items = []

    if (originalPrice) {
      items.push({
        item: '??????',
        itemOp: `${formatKoreaPrice(originalPrice)}???`,
      })
      items.push({
        item: '????????????',
        itemOp: `${formatKoreaPrice(minimumPrice - originalPrice)}???`,
      })
    }

    const url = `${window.location.href.split('?')[0]}?url=${encodeURIComponent(URL)}`
    const link = { mobileWebUrl: url, webUrl: url }

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      itemContent: {
        profileText: `${format(new Date(updateTime), 'y.M.d H:m')} ??????`,
        items,
        sum: '?????????',
        sumOp: `${formatKoreaPrice(minimumPrice)}???`,
      },
      content: {
        title: sharingProduct.name,
        description: sharingProduct.options?.map((option) => option.value).join(', '),
        imageUrl: imageURL,
        link,
      },
      // social: {
      //   likeCount: 10,
      //   commentCount: 20,
      //   sharedCount: 30,
      // },
      buttons: [{ title: '????????? ??????', link }],
    })
  }

  return (
    <>
      <form onSubmit={handleSubmit(searchProduct)}>
        <div className="m-2">
          <input
            className="w-full	p-2	border-2 border-slate-300 rounded focus:outline-fox-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
            disabled={isFetching}
            placeholder="URL ????????? ??????????????????"
            {...register('url', {
              required: 'URL ????????? ??????????????????',
              pattern: {
                value:
                  /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/,
                message: '????????? URL ???????????? ??????????????????',
              },
            })}
          />
        </div>
        {errors.url && <div className="text-sm text-red-600 m-2">{errors.url.message}</div>}
        <button
          className="bg-fox-700  w-full p-2 my-4 text-white font-semibold text-2xl disabled:bg-slate-300 disabled:cursor-not-allowed md:rounded"
          disabled={!isFetching && !isDirty}
          type="submit"
        >
          <div className="flex gap-2 justify-center items-center">
            {isFetching && <LoadingSpinner />}
            <div>{isFetching ? '??????' : '??????'}</div>
          </div>
        </button>
      </form>

      <pre className="border-2 mx-2 my-8 p-2 border-slate-200 overflow-x-auto md:mx-0">
        {error?.toString() ?? '??????'}
      </pre>

      <div>
        <SearchResult
          product={(product ?? productPlaceholder) as ProductPlaceholder}
          isFetching={isFetching}
        />
        <NotificationForm product={(product ?? productPlaceholder) as ProductPlaceholder} />
        <div className="sticky bottom-0 z-30 grid grid-cols-2 gap-2 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] ">
          <button
            className="bg-fox-700/90 text-white rounded font-semibold text-xl text-center p-3 w-full md:rounded hover:bg-fox-800 active:bg-fox-800 backdrop-blur-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
            disabled={isFetching}
            onClick={shareWithKakaotalk}
          >
            ????????????
          </button>
          <button
            className="bg-fox-700/90 text-white rounded break-keep font-semibold text-xl text-center p-3 w-full md:rounded hover:bg-fox-800 active:bg-fox-800 backdrop-blur-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
            disabled={isFetching}
            onClick={() => window.open(product?.affiliateLink ?? product?.URL, '_blank')}
          >
            ????????????
          </button>
        </div>
      </div>
    </>
  )
}

function getValidURL(input: string | null) {
  if (!input) return ''

  try {
    const validURL = new URL(input)
    const hostname = validURL.hostname

    if (hostname === 'www.coupang.com') {
      const searchParams = new URLSearchParams(validURL.search)
      const newSearchParams: any = {}
      const venderItemId = searchParams.get('vendorItemId')
      const itemId = searchParams.get('itemId')
      if (venderItemId) newSearchParams.vendorItemId = venderItemId
      if (itemId) newSearchParams.itemId = itemId
      validURL.search = new URLSearchParams(newSearchParams).toString()
    } else if (hostname === 'link.coupang.com') {
      validURL.search = ''
    } else if (hostname === 'ohou.se') {
      toast.error('?????? ???????????????')
      return ''
    } else if (hostname === 'prod.danawa.com') {
      toast.error('?????? ???????????????')
      return ''
    } else {
      toast.error('???????????? ?????? URL ???????????????')
      return ''
    }

    validURL.searchParams.sort()
    return validURL.toString()
  } catch (error) {
    return ''
  }
}
