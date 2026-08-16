"use client"

import React, { useState, useEffect } from "react"
import { 
  Button, 
  Table, 
  Modal, 
  TextField, 
  Label, 
  Input,
  Select,
  ListBox,
  Chip
} from "@heroui/react"
import { Plus, Edit2, Trash2, Loader2, AlertTriangle, Search, Filter } from "lucide-react"

interface Category {
  id: number
  name: string
}

interface Product {
  id: number
  sku: string
  name: string
  category_id: number | null
  category?: Category
  purchase_price: string
  selling_price: string
  stock: number
  minimum_stock: number
  is_active: boolean
}

const initialForm = {
  sku: "",
  name: "",
  category_id: "" as any,
  purchase_price: "",
  selling_price: "",
  stock: "0",
  minimum_stock: "0"
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Form State
  const [formData, setFormData] = useState(initialForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("http://localhost:8000/api/products"),
        fetch("http://localhost:8000/api/categories")
      ])
      
      const prodData = await prodRes.json()
      const catData = await catRes.json()
      
      setProducts(prodData)
      setCategories(catData)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent, close: () => void) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const url = editingId 
        ? `http://localhost:8000/api/products/${editingId}`
        : "http://localhost:8000/api/products"
        
      const payload = {
        ...formData,
        category_id: formData.category_id || null,
      }
        
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Failed to save product")
      }

      await fetchData()
      close()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (close: () => void) => {
    if (!deleteId) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`http://localhost:8000/api/products/${deleteId}`, {
        method: "DELETE"
      })
      if (!res.ok) throw new Error("Failed to delete product")
      
      await fetchData()
      close()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
      setDeleteId(null)
    }
  }

  const openEdit = (product: Product) => {
    setEditingId(product.id)
    setFormData({
      sku: product.sku,
      name: product.name,
      category_id: product.category_id ? product.category_id.toString() : "",
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      stock: product.stock.toString(),
      minimum_stock: product.minimum_stock.toString()
    })
  }

  const openCreate = () => {
    setEditingId(null)
    setFormData(initialForm)
    setError("")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-default-900">Products</h1>
          <p className="text-default-500">
            Manage your inventory and product details.
          </p>
        </div>
        
        <Modal>
          <Modal.Trigger>
            <Button variant="primary" onPress={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </Modal.Trigger>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog className="max-w-xl">
                <Modal.Header>
                  <h3 className="text-lg font-semibold">{editingId ? "Edit Product" : "Add New Product"}</h3>
                </Modal.Header>
                <Modal.Body>
                  <form id="productForm" onSubmit={(e) => { e.preventDefault() }}>
                    <div className="flex flex-col gap-4 py-2">
                      {error && <div className="text-danger text-sm">{error}</div>}
                      
                      <div className="flex gap-4">
                        <TextField 
                          isRequired 
                          value={formData.sku}
                          onChange={(val: string) => setFormData({ ...formData, sku: val })}
                          className="flex flex-col gap-1 w-1/3"
                        >
                          <Label>SKU</Label>
                          <Input placeholder="PROD-001" />
                        </TextField>

                        <TextField 
                          isRequired 
                          value={formData.name}
                          onChange={(val: string) => setFormData({ ...formData, name: val })}
                          className="flex flex-col gap-1 w-2/3"
                        >
                          <Label>Product Name</Label>
                          <Input placeholder="e.g., Kopi Gula Aren" />
                        </TextField>
                      </div>

                      <div className="flex flex-col gap-1 w-full">
                        <Select 
                          selectedKey={formData.category_id || undefined}
                          onSelectionChange={(key: any) => setFormData({ ...formData, category_id: key })}
                        >
                          <Label className="text-sm font-medium">Category</Label>
                          <Select.Trigger className="w-full">
                            <Select.Value placeholder="Select category" />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {categories.map((cat) => (
                                <ListBox.Item id={cat.id.toString()} textValue={cat.name} key={cat.id.toString()}>
                                  {cat.name}
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </div>

                      <div className="flex gap-4">
                        <TextField 
                          isRequired 
                          type="number"
                          value={formData.purchase_price}
                          onChange={(val: string) => setFormData({ ...formData, purchase_price: val })}
                          className="flex flex-col gap-1 w-1/2"
                        >
                          <Label>Purchase Price (Rp)</Label>
                          <Input />
                        </TextField>

                        <TextField 
                          isRequired 
                          type="number"
                          value={formData.selling_price}
                          onChange={(val: string) => setFormData({ ...formData, selling_price: val })}
                          className="flex flex-col gap-1 w-1/2"
                        >
                          <Label>Selling Price (Rp)</Label>
                          <Input />
                        </TextField>
                      </div>

                      <div className="flex gap-4">
                        <TextField 
                          isRequired 
                          type="number"
                          value={formData.stock}
                          onChange={(val: string) => setFormData({ ...formData, stock: val })}
                          className="flex flex-col gap-1 w-1/2"
                        >
                          <Label>Current Stock</Label>
                          <Input />
                        </TextField>

                        <TextField 
                          isRequired 
                          type="number"
                          value={formData.minimum_stock}
                          onChange={(val: string) => setFormData({ ...formData, minimum_stock: val })}
                          className="flex flex-col gap-1 w-1/2"
                        >
                          <Label>Minimum Stock</Label>
                          <Input />
                        </TextField>
                      </div>

                    </div>
                  </form>
                </Modal.Body>
                <Modal.Footer>
                  <Modal.CloseTrigger>
                    <Button variant="tertiary">Cancel</Button>
                  </Modal.CloseTrigger>
                  <Modal.CloseTrigger>
                    <Button variant="primary" isPending={isSubmitting} onPress={(e: any) => {
                      handleSubmit(e as any, () => {})
                    }}>
                      Save Changes
                    </Button>
                  </Modal.CloseTrigger>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:max-w-sm">
          <TextField className="w-full">
             <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10"><Search className="w-4 h-4 text-default-400" /></span>
                <Input placeholder="Search products..." className="pl-9 w-full" />
             </div>
          </TextField>
        </div>
        <Button variant="secondary">
          <Filter className="mr-2 h-4 w-4" /> Filter
        </Button>
      </div>

      <div className="bg-background rounded-lg border border-default-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table aria-label="Products table" className="w-full">
            <Table.Header>
              <Table.Column>SKU</Table.Column>
              <Table.Column>PRODUCT NAME</Table.Column>
              <Table.Column>CATEGORY</Table.Column>
              <Table.Column>PRICE</Table.Column>
              <Table.Column>STOCK</Table.Column>
              <Table.Column>STATUS</Table.Column>
              <Table.Column className="text-right">ACTIONS</Table.Column>
            </Table.Header>
            <Table.Body>
              {products.map((product) => (
                <Table.Row key={product.id}>
                  <Table.Cell className="py-3 px-4 font-medium">{product.sku}</Table.Cell>
                  <Table.Cell className="py-3 px-4">{product.name}</Table.Cell>
                  <Table.Cell className="py-3 px-4 text-default-500">{product.category?.name || '-'}</Table.Cell>
                  <Table.Cell className="py-3 px-4">Rp {Number(product.selling_price).toLocaleString('id-ID')}</Table.Cell>
                  <Table.Cell className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className={product.stock <= product.minimum_stock ? "text-danger font-bold" : ""}>
                        {product.stock}
                      </span>
                      {product.stock <= product.minimum_stock && (
                        <Chip color="danger" size="sm" variant="flat" className="h-5 text-[10px]">Low</Chip>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="py-3 px-4">
                    <Chip color={product.is_active ? "success" : "default"} variant="flat" size="sm">
                      {product.is_active ? "Active" : "Inactive"}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Modal>
                        <Modal.Trigger>
                          <Button isIconOnly variant="tertiary" onPress={() => openEdit(product)}>
                            <Edit2 className="w-4 h-4 text-default-500" />
                          </Button>
                        </Modal.Trigger>
                        <Modal.Backdrop>
                          <Modal.Container>
                            <Modal.Dialog className="max-w-xl">
                              <Modal.Header><h3 className="text-lg font-semibold">Edit Product</h3></Modal.Header>
                              <Modal.Body>
                                <div className="flex flex-col gap-4 py-2">
                                  {error && <div className="text-danger text-sm">{error}</div>}
                                  
                                  <div className="flex gap-4">
                                    <TextField 
                                      isRequired 
                                      value={formData.sku}
                                      onChange={(val: string) => setFormData({ ...formData, sku: val })}
                                      className="flex flex-col gap-1 w-1/3"
                                    >
                                      <Label>SKU</Label>
                                      <Input />
                                    </TextField>
                                    <TextField 
                                      isRequired 
                                      value={formData.name}
                                      onChange={(val: string) => setFormData({ ...formData, name: val })}
                                      className="flex flex-col gap-1 w-2/3"
                                    >
                                      <Label>Product Name</Label>
                                      <Input />
                                    </TextField>
                                  </div>

                                  <div className="flex flex-col gap-1 w-full">
                                    <Select 
                                      selectedKey={formData.category_id || undefined}
                                      onSelectionChange={(key: any) => setFormData({ ...formData, category_id: key })}
                                    >
                                      <Label className="text-sm font-medium">Category</Label>
                                      <Select.Trigger className="w-full">
                                        <Select.Value placeholder="Select category" />
                                        <Select.Indicator />
                                      </Select.Trigger>
                                      <Select.Popover>
                                        <ListBox>
                                          {categories.map((cat) => (
                                            <ListBox.Item id={cat.id.toString()} textValue={cat.name} key={cat.id.toString()}>
                                              {cat.name}
                                            </ListBox.Item>
                                          ))}
                                        </ListBox>
                                      </Select.Popover>
                                    </Select>
                                  </div>

                                  <div className="flex gap-4">
                                    <TextField 
                                      isRequired type="number"
                                      value={formData.purchase_price}
                                      onChange={(val: string) => setFormData({ ...formData, purchase_price: val })}
                                      className="flex flex-col gap-1 w-1/2"
                                    >
                                      <Label>Purchase Price</Label>
                                      <Input />
                                    </TextField>
                                    <TextField 
                                      isRequired type="number"
                                      value={formData.selling_price}
                                      onChange={(val: string) => setFormData({ ...formData, selling_price: val })}
                                      className="flex flex-col gap-1 w-1/2"
                                    >
                                      <Label>Selling Price</Label>
                                      <Input />
                                    </TextField>
                                  </div>
                                  
                                  <div className="flex gap-4">
                                    <TextField 
                                      isRequired type="number"
                                      value={formData.stock}
                                      onChange={(val: string) => setFormData({ ...formData, stock: val })}
                                      className="flex flex-col gap-1 w-1/2"
                                    >
                                      <Label>Stock</Label>
                                      <Input />
                                    </TextField>
                                    <TextField 
                                      isRequired type="number"
                                      value={formData.minimum_stock}
                                      onChange={(val: string) => setFormData({ ...formData, minimum_stock: val })}
                                      className="flex flex-col gap-1 w-1/2"
                                    >
                                      <Label>Min Stock</Label>
                                      <Input />
                                    </TextField>
                                  </div>
                                </div>
                              </Modal.Body>
                              <Modal.Footer>
                                <Modal.CloseTrigger>
                                  <Button variant="tertiary">Cancel</Button>
                                </Modal.CloseTrigger>
                                <Modal.CloseTrigger>
                                  <Button variant="primary" isPending={isSubmitting} onPress={(e: any) => {
                                    handleSubmit(e as any, () => {})
                                  }}>
                                    Save Changes
                                  </Button>
                                </Modal.CloseTrigger>
                              </Modal.Footer>
                            </Modal.Dialog>
                          </Modal.Container>
                        </Modal.Backdrop>
                      </Modal>

                      <Modal>
                        <Modal.Trigger>
                          <Button isIconOnly variant="danger-soft" onPress={() => setDeleteId(product.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </Modal.Trigger>
                        <Modal.Backdrop>
                          <Modal.Container>
                            <Modal.Dialog>
                              <Modal.Header>
                                <div className="flex items-center gap-2 text-danger">
                                  <AlertTriangle className="w-5 h-5" />
                                  <h3 className="text-lg font-semibold">Delete Product</h3>
                                </div>
                              </Modal.Header>
                              <Modal.Body>
                                <p>Are you sure you want to delete <strong>{product.name}</strong>?</p>
                                <p className="text-sm text-default-500">This action cannot be undone.</p>
                              </Modal.Body>
                              <Modal.Footer>
                                <Modal.CloseTrigger>
                                  <Button variant="tertiary">Cancel</Button>
                                </Modal.CloseTrigger>
                                <Modal.CloseTrigger>
                                  <Button variant="danger" isPending={isSubmitting} onPress={() => handleDelete(() => {})}>
                                    Delete
                                  </Button>
                                </Modal.CloseTrigger>
                              </Modal.Footer>
                            </Modal.Dialog>
                          </Modal.Container>
                        </Modal.Backdrop>
                      </Modal>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
              {products.length === 0 && (
                <Table.Row>
                  <Table.Cell className="py-8 text-center text-default-500">No products found</Table.Cell>
                  <Table.Cell>{""}</Table.Cell>
                  <Table.Cell>{""}</Table.Cell>
                  <Table.Cell>{""}</Table.Cell>
                  <Table.Cell>{""}</Table.Cell>
                  <Table.Cell>{""}</Table.Cell>
                  <Table.Cell>{""}</Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
        )}
      </div>
    </div>
  )
}
