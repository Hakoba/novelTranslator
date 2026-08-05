import { createPage } from "@/utils/createPage"
import App from "./app.vue"
import "./index.css"

// ?type=update открывается из background при обновлении расширения
const target = new URLSearchParams(location.search).get("type") === "update"
  ? "/setup/update"
  : "/setup/install"

export default createPage(App, target)
