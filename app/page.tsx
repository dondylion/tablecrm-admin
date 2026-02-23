import ProductCreateForm from "@/components/product-create-form";

const tips = [
  "Заполните обязательные поля: название, артикул, единица измерения и категория.",
  "SEO-ключи указывайте через запятую, система преобразует их в массив.",
  "Координаты помогут точнее отображать товар в геопоиске маркетплейса.",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">Dashboard / Nomenclature</p>
          <h1 className="text-3xl font-semibold tracking-tight">Создание карточки товара</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Интерфейс спроектирован под быструю загрузку товаров: заполняйте только нужные поля,
            просматривайте итоговый JSON до отправки и сохраняйте черновик автоматически.
          </p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {tips.map((tip, index) => (
            <section key={tip} className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Совет {index + 1}</p>
              <p className="text-sm leading-6">{tip}</p>
            </section>
          ))}
        </div>

        <ProductCreateForm />
      </main>
    </div>
  );
}
