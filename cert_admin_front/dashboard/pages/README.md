# Заглушка

Пустая папка `pages/` нужна, чтобы Next.js не принял FSD-слой `src/pages` за Pages Router (корневые `app/` и `pages/` имеют приоритет над `src/app` и `src/pages`). Код FSD-слоёв живёт в `src/`.
