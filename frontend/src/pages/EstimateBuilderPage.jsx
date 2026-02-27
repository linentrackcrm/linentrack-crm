import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { estimatesApi, accountsApi, pipelineApi } from '@/services/api'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, ChevronDown, ChevronUp, Save, Send,
  FileText, Calculator, Download, Copy, CheckCircle,
  Building2, DollarSign, Percent, Info
} from 'lucide-react'
import clsx from 'clsx'

const LINEN_CATEGORIES = [
  { id: 'fnb_linens',    label: 'F&B Linens',              unit: 'piece', default_price: 0.38, description: 'Tablecloths, napkins, runners' },
  { id: 'uniforms',      label: 'Kitchen Uniforms',         unit: 'piece', default_price: 0.95, description: 'Chef coats, aprons, kitchen wear' },
  { id: 'terry',         label: 'Bath Towels & Terry',      unit: 'piece', default_price: 0.42, description: 'Bath towels, hand towels, washcloths' },
  { id: 'bed_linens',    label: 'Bed Linens',               unit: 'piece', default_price: 0.55, description: 'Sheets, pillowcases, duvet covers' },
  { id: 'mats',          label: 'Floor Mats',               unit: 'mat',   default_price: 2.80, description: 'Entrance, anti-fatigue, kitchen mats' },
  { id: 'healthcare',    label: 'Healthcare Textiles',       unit: 'piece', default_price: 0.65, description: 'Patient gowns, scrubs, surgical linens' },
  { id: 'spa',           label: 'Spa & Salon',              unit: 'piece', default_price: 0.52, description: 'Robes, wraps, salon towels' },
  { id: 'uniforms_gen',  label: 'General Uniforms',         unit: 'piece', default_price: 1.10, description: 'Front-of-house, corporate uniforms' },
]

const CONTRACT_LENGTHS = [
  { value: 0,  label: 'Month-to-Month', discount: 0 },
  { value: 12, label: '1 Year',         discount: 3 },
  { value: 24, label: '2 Years',        discount: 5 },
  { value: 36, label: '3 Years',        discount: 8 },
]

const fmtCurrency = v => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0)

export default function EstimateBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEditing = Boolean(id)

  const { data: existing } = useQuery({
    queryKey: ['estimate', id],
    queryFn: () => estimatesApi.get(id).then(r => r.data),
    enabled: isEditing,
  })

  const { data: rateCard } = useQuery({
    queryKey: ['rate-card'],
    queryFn: () => estimatesApi.rateCard().then(r => r.data),
  })

  const { register, control, watch, setValue, getValues, reset, handleSubmit, formState: { isDirty } } = useForm({
    defaultValues: {
      account_id:       '',
      opportunity_id:   '',
      contact_id:       '',
      contract_length:  12,
      line_items:       [],
      delivery_fee:     125,
      fuel_surcharge:   0,
      setup_fee:        0,
      discount_type:    'none',
      discount_value:   0,
      tax_rate:         0,
      notes:            '',
      comparison_mode:  false,
    }
  })

  const { fields, append, remove, update } = useFieldArray({ control, name: 'line_items' })
  const watchAll = watch()

  // Populate form if editing
  useEffect(() => {
    if (existing) reset({ ...existing })
  }, [existing, reset])

  // Auto-apply rate card prices
  const addCategory = useCallback((cat) => {
    const rateCardPrice = rateCard?.categories?.[cat.id]?.price_per_piece
    append({
      category:       cat.id,
      description:    cat.label,
      weekly_pieces:  0,
      price_per_piece: rateCardPrice ?? cat.default_price,
      monthly_pieces: 0,
      monthly_total:  0,
      annual_total:   0,
    })
  }, [append, rateCard])

  // Recalculate line on change
  const handleLineChange = (index, field, value) => {
    const line = getValues(`line_items.${index}`)
    const updated = { ...line, [field]: parseFloat(value) || 0 }

    if (field === 'weekly_pieces') {
      updated.monthly_pieces = Math.round(updated.weekly_pieces * 4.33)
    }
    updated.monthly_total = updated.monthly_pieces * updated.price_per_piece
    updated.annual_total  = updated.monthly_total * 12

    update(index, updated)
  }

  // Calculate totals
  const totals = calculateTotals(watchAll)

  // Save draft
  const saveMutation = useMutation({
    mutationFn: data => isEditing ? estimatesApi.update(id, data) : estimatesApi.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['estimates'] })
      toast.success(isEditing ? 'Estimate saved' : 'Estimate created')
      if (!isEditing) navigate(`/estimates/${res.data.id}/edit`)
    },
    onError: () => toast.error('Failed to save estimate'),
  })

  // Send to customer
  const sendMutation = useMutation({
    mutationFn: () => estimatesApi.send(id),
    onSuccess: () => { toast.success('Estimate sent!'); qc.invalidateQueries({ queryKey: ['estimate', id] }) },
    onError: () => toast.error('Failed to send estimate'),
  })

  const contractLength = CONTRACT_LENGTHS.find(c => c.value === watchAll.contract_length) || CONTRACT_LENGTHS[1]

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Estimate' : 'New Estimate'}</h1>
          {existing?.estimate_number && (
            <p className="text-sm text-gray-500">{existing.estimate_number} · {existing.status}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isEditing && (
            <>
              <button className="btn-outline flex items-center gap-2 text-sm" onClick={() => estimatesApi.duplicate(id)}>
                <Copy className="w-4 h-4" /> Duplicate
              </button>
              <button className="btn-outline flex items-center gap-2 text-sm" onClick={() => estimatesApi.pdf(id)}>
                <Download className="w-4 h-4" /> Export PDF
              </button>
              <button
                className="btn-primary flex items-center gap-2 text-sm"
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
              >
                <Send className="w-4 h-4" /> Send to Customer
              </button>
            </>
          )}
          <button
            className="btn-primary flex items-center gap-2 text-sm"
            onClick={handleSubmit(d => saveMutation.mutate(d))}
            disabled={saveMutation.isPending}
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save Estimate'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Builder */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* Step 1: Account */}
          <BuilderSection number="1" title="Account & Opportunity">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Account *">
                <AccountSelector
                  value={watchAll.account_id}
                  onChange={v => setValue('account_id', v)}
                />
              </FormField>
              <FormField label="Linked Opportunity">
                <input {...register('opportunity_id')} className="input" placeholder="Select opportunity..." />
              </FormField>
              <FormField label="Primary Contact">
                <input {...register('contact_id')} className="input" placeholder="Select contact..." />
              </FormField>
              <FormField label="Valid Until">
                <input {...register('valid_until')} type="date" className="input" />
              </FormField>
            </div>
          </BuilderSection>

          {/* Step 2: Line Items */}
          <BuilderSection number="2" title="Linen Services & Pricing">
            {/* Category quick-add */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Add Product Category</p>
              <div className="flex flex-wrap gap-2">
                {LINEN_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => addCategory(cat)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full hover:bg-brand-50 hover:border-brand-300 hover:text-brand-600 transition-colors font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Line items table */}
            {fields.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-brand-600 text-white">
                    <tr>
                      <th className="text-left px-3 py-2.5 font-semibold">Category / Description</th>
                      <th className="text-center px-3 py-2.5 font-semibold w-28">Weekly Pcs</th>
                      <th className="text-center px-3 py-2.5 font-semibold w-28">Monthly Pcs</th>
                      <th className="text-center px-3 py-2.5 font-semibold w-32">Price/Piece</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-32">Monthly Total</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-32">Annual Total</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
                      const cat = LINEN_CATEGORIES.find(c => c.id === field.category)
                      return (
                        <tr key={field.id} className={clsx('border-t border-gray-100', index % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                          <td className="px-3 py-2">
                            <p className="font-medium text-gray-800">{cat?.label || field.description}</p>
                            {cat?.description && <p className="text-xs text-gray-400">{cat.description}</p>}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              value={field.weekly_pieces}
                              onChange={e => handleLineChange(index, 'weekly_pieces', e.target.value)}
                              className="w-full text-center border border-gray-200 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-brand-400 focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600">
                            {field.monthly_pieces?.toLocaleString() || 0}
                          </td>
                          <td className="px-3 py-2">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={field.price_per_piece}
                                onChange={e => handleLineChange(index, 'price_per_piece', e.target.value)}
                                className="w-full pl-5 border border-gray-200 rounded px-2 py-1 text-sm text-right focus:ring-1 focus:ring-brand-400 focus:outline-none"
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-800">
                            {fmtCurrency(field.monthly_total)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">
                            {fmtCurrency(field.annual_total)}
                          </td>
                          <td className="px-2 py-2">
                            <button onClick={() => remove(index)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {fields.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Add product categories above to build your estimate</p>
              </div>
            )}
          </BuilderSection>

          {/* Step 3: Fees & Adjustments */}
          <BuilderSection number="3" title="Fees, Discounts & Contract Terms">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <FormField label="Route/Delivery Fee ($/mo)">
                <CurrencyInput {...register('delivery_fee', { valueAsNumber: true })} />
              </FormField>
              <FormField label="Fuel Surcharge ($/mo)">
                <CurrencyInput {...register('fuel_surcharge', { valueAsNumber: true })} />
              </FormField>
              <FormField label="Setup / Equipment Fee">
                <CurrencyInput {...register('setup_fee', { valueAsNumber: true })} />
              </FormField>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField label="Discount Type">
                <select {...register('discount_type')} className="input">
                  <option value="none">No Discount</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </FormField>
              {watchAll.discount_type !== 'none' && (
                <FormField label={watchAll.discount_type === 'percentage' ? 'Discount %' : 'Discount Amount'}>
                  <input {...register('discount_value', { valueAsNumber: true })} type="number" step="0.1" min="0" className="input" />
                </FormField>
              )}
              <FormField label="Tax Rate (%)">
                <input {...register('tax_rate', { valueAsNumber: true })} type="number" step="0.1" min="0" className="input" placeholder="0" />
              </FormField>
            </div>

            {/* Contract Length */}
            <div className="mt-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Contract Length</p>
              <div className="grid grid-cols-4 gap-3">
                {CONTRACT_LENGTHS.map(cl => (
                  <button
                    key={cl.value}
                    type="button"
                    onClick={() => setValue('contract_length', cl.value)}
                    className={clsx(
                      'flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all',
                      watchAll.contract_length === cl.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    )}
                  >
                    <span className="font-bold text-sm">{cl.label}</span>
                    {cl.discount > 0 && (
                      <span className="text-xs mt-1 text-green-600 font-semibold">{cl.discount}% off</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </BuilderSection>

          {/* Notes */}
          <BuilderSection number="4" title="Notes & Terms">
            <FormField label="Customer-facing Notes">
              <textarea {...register('notes')} className="input h-24 resize-none" placeholder="Special terms, service guarantees, exclusions..." />
            </FormField>
            <FormField label="Internal Notes (not shown to customer)">
              <textarea {...register('internal_notes')} className="input h-20 resize-none" placeholder="Margin notes, approval reasons..." />
            </FormField>
          </BuilderSection>
        </div>

        {/* Right: Pricing Summary */}
        <div className="w-80 flex-shrink-0 overflow-y-auto bg-white border-l border-gray-200 p-5">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-brand-600" />
            Pricing Summary
          </h3>

          <div className="space-y-3">
            <TotalRow label="Service Subtotal" value={fmtCurrency(totals.subtotal)} />
            {totals.delivery_fee > 0 && <TotalRow label="Delivery Fee" value={fmtCurrency(totals.delivery_fee)} />}
            {totals.fuel_surcharge > 0 && <TotalRow label="Fuel Surcharge" value={fmtCurrency(totals.fuel_surcharge)} />}
            {totals.setup_fee > 0 && <TotalRow label="Setup Fee (one-time)" value={fmtCurrency(totals.setup_fee)} light />}
            {totals.discount_amount > 0 && <TotalRow label="Discount" value={`-${fmtCurrency(totals.discount_amount)}`} color="text-green-600" />}
            {totals.tax_amount > 0 && <TotalRow label={`Tax (${watchAll.tax_rate}%)`} value={fmtCurrency(totals.tax_amount)} />}
          </div>

          <div className="mt-4 pt-4 border-t-2 border-brand-600 space-y-3">
            <div className="bg-brand-600 rounded-xl p-4 text-white text-center">
              <p className="text-xs text-brand-200 uppercase tracking-wider">Monthly Total</p>
              <p className="text-3xl font-bold mt-1">{fmtCurrency(totals.monthly_total)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
              <p className="text-xs text-green-600 uppercase tracking-wider">Annual Contract Value</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{fmtCurrency(totals.annual_total)}</p>
              {contractLength.discount > 0 && (
                <p className="text-xs text-green-600 mt-1">Includes {contractLength.discount}% term discount</p>
              )}
            </div>
          </div>

          {/* Weekly pieces summary */}
          <div className="mt-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Volume Summary</p>
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Weekly pieces</span><span className="font-medium">{totals.weekly_pieces.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Monthly pieces</span><span className="font-medium">{totals.monthly_pieces.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Annual pieces</span><span className="font-medium">{totals.annual_pieces.toLocaleString()}</span></div>
              {totals.monthly_total > 0 && totals.monthly_pieces > 0 && (
                <div className="flex justify-between pt-1 border-t border-gray-200"><span className="text-gray-500">Avg price/piece</span><span className="font-semibold text-brand-600">${(totals.monthly_total / totals.monthly_pieces).toFixed(3)}</span></div>
              )}
            </div>
          </div>

          {/* Margin indicator */}
          <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-xs font-semibold text-orange-700 mb-1 flex items-center gap-1"><Info className="w-3 h-3" /> Manager Approval</p>
            <p className="text-xs text-orange-600">Discounts over 10% require manager approval before sending.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────

function BuilderSection({ number, title, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {number}
        </span>
        <span className="font-semibold text-gray-800 flex-1">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

function CurrencyInput(props) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
      <input type="number" step="0.01" min="0" {...props} className="input pl-7" />
    </div>
  )
}

function AccountSelector({ value, onChange }) {
  const { data } = useQuery({
    queryKey: ['accounts-select'],
    queryFn: () => accountsApi.list({ per_page: 100 }).then(r => r.data.data),
  })
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="input">
      <option value="">Select account...</option>
      {data?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select>
  )
}

function TotalRow({ label, value, color = 'text-gray-800', light }) {
  return (
    <div className={clsx('flex justify-between text-sm', light && 'text-gray-400 text-xs')}>
      <span className="text-gray-500">{label}</span>
      <span className={clsx('font-semibold', color)}>{value}</span>
    </div>
  )
}

function calculateTotals(values) {
  const items = values.line_items || []
  const subtotal = items.reduce((s, i) => s + (i.monthly_total || 0), 0)
  const delivery  = parseFloat(values.delivery_fee) || 0
  const fuel      = parseFloat(values.fuel_surcharge) || 0
  const setup     = parseFloat(values.setup_fee) || 0
  const beforeDiscount = subtotal + delivery + fuel

  let discountAmt = 0
  if (values.discount_type === 'percentage') discountAmt = beforeDiscount * ((parseFloat(values.discount_value) || 0) / 100)
  if (values.discount_type === 'fixed')      discountAmt = parseFloat(values.discount_value) || 0

  const afterDiscount = beforeDiscount - discountAmt
  const taxAmt = afterDiscount * ((parseFloat(values.tax_rate) || 0) / 100)
  const monthly = afterDiscount + taxAmt

  const contractLength = CONTRACT_LENGTHS.find(c => c.value === values.contract_length) || CONTRACT_LENGTHS[1]
  const termDiscount   = contractLength.discount / 100
  const annual = monthly * 12 * (1 - termDiscount)

  const weeklyPieces  = items.reduce((s, i) => s + (i.weekly_pieces  || 0), 0)
  const monthlyPieces = items.reduce((s, i) => s + (i.monthly_pieces || 0), 0)

  return {
    subtotal, delivery_fee: delivery, fuel_surcharge: fuel, setup_fee: setup,
    discount_amount: discountAmt, tax_amount: taxAmt,
    monthly_total: monthly, annual_total: annual,
    weekly_pieces: weeklyPieces, monthly_pieces: monthlyPieces,
    annual_pieces: monthlyPieces * 12,
  }
}
