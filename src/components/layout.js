/**
 * Layout component that queries for data
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.com/docs/use-static-query/
 */

import * as React from "react"
import PropTypes from "prop-types"
import { useStaticQuery, graphql } from "gatsby"

import Sidebar from "./Sidebar"
import "./layout.css"

const Layout = ({ children }) => {
  const data = useStaticQuery(graphql`
    query SiteTitleQuery {
      site {
        siteMetadata {
          title
        }
      }
    }
  `)

  return (
    <div className="swiftyy-shell">
      <Sidebar />
      <div className="swiftyy-content">
        <header className="swiftyy-header glass">
          <div className="header-title">{data.site.siteMetadata?.title || `Swiftyy`}</div>
          <div className="header-actions">
            <a className="btn primary" href="/dashboard/">Dashboard</a>
            <a className="btn" href="/alpha-tracker/">AlphaTracker</a>
          </div>
        </header>
        <main className="swiftyy-main glass">{children}</main>
        <footer className="swiftyy-footer">
          © {new Date().getFullYear()} Swiftyy
        </footer>
      </div>
    </div>
  )
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
}

export default Layout
