import React, { useState } from "react";
import { HiMenuAlt4 } from "react-icons/hi";
import { AiOutlineClose } from "react-icons/ai";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Tooltip } from "react-tooltip";

import { useWallet } from "../../hooks/useWallet";
import { useContract } from "../../hooks/useContract";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";

const NavBarItem = ({ title, path, active, closeMenu, classprops, requiresWallet }) => (
  <li className={`mx-4 relative group ${classprops || ""}`}>
    <Link
      to={path}
      onClick={closeMenu}
      data-tooltip-id={requiresWallet ? "nav-wallet-required-tooltip" : undefined}
      data-tooltip-content={requiresWallet ? "Connect your wallet to use this page" : undefined}
      className={`text-sm transition duration-300 py-4 flex items-center justify-end gap-1.5 ${
        requiresWallet
          ? "text-slate-500 hover:text-slate-300"
          : active
          ? "text-white font-medium"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {title}
      {requiresWallet && (
        <span aria-label="Requires wallet connection" className="text-[10px] text-slate-600">
          🔒
        </span>
      )}
    </Link>
    {/* White sliding underline indicator */}
    <span
      className={`absolute bottom-0 left-0 h-[2px] bg-white transition-all duration-300 ${
        active ? "w-full" : "w-0 group-hover:w-full"
      }`}
    ></span>
  </li>
);

/* Reuses the site favicon as the navbar mark instead of duplicating the SVG
   inline — one cacheable static asset instead of markup re-parsed on every
   render, and the two stay in sync automatically if the icon changes. */
const CPLogo = () => <img src="/favicon.svg" alt="" className="w-7 h-7" />;

/** Compact address chip + disconnect, shared between the desktop bar and the mobile drawer. */
const WalletChip = ({ currentAccount, onDisconnect, full = false }) => (
  <div
    className={`flex items-center gap-2.5 bg-surface border border-white/5 rounded-lg shadow-lg ${
      full ? "w-full justify-between px-3.5 py-2.5" : "px-3 py-1.5"
    }`}
  >
    <span className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-signal"></span>
      </span>
      <p className="text-slate-300 font-mono text-xs font-semibold tracking-tight">
        {`${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`}
      </p>
    </span>
    <button
      className="bg-white/5 hover:bg-negative hover:text-white border border-white/5 text-slate-400 text-[10px] font-bold py-1 px-2.5 rounded transition duration-200 flex-shrink-0"
      onClick={onDisconnect}
    >
      Disconnect
    </button>
  </div>
);

const Navbar = () => {
  const [toggleMenu, setToggleMenu] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { connectWallet, currentAccount, disconnectWallet, isConnectedToSite } = useWallet();
  const { isAdmin } = useContract();
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useToast();

  const handleConnect = async () => {
    if (isConnecting) return;
    if (!window.ethereum) {
      notify({ variant: "error", message: "No wallet found. Install MetaMask to connect." });
      return;
    }
    setIsConnecting(true);
    try {
      await connectWallet();
      notify({ variant: "success", message: "Wallet connected." });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      notify({ variant: "error", message: error.message || "Failed to connect wallet. Please try again." });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    navigate("/");
  };

  const menuItems = [
    { title: "Dashboard", path: "/" },
    { title: "Watchlist", path: "/watchlist" },
    { title: "Transfer", path: "/transfer", requiresWallet: true },
    { title: "Allowance", path: "/allowance", requiresWallet: true },
    ...(isAdmin ? [{ title: "Admin Panel", path: "/admin", requiresWallet: true }] : []),
  ];

  return (
    <nav className="sticky top-0 w-full h-14 flex items-center justify-between gap-3 px-4 sm:px-6 backdrop-blur-md bg-base/90 border-b border-white/5 z-50">
      {/* Brand logo: compact layout */}
      <div className="flex items-center text-xl font-semibold tracking-tight min-w-0 flex-shrink-0">
        <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group min-w-0">
          <div className="group-hover:scale-105 transition-all duration-300 flex-shrink-0">
            <CPLogo />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white group-hover:text-signal transition-colors duration-200 select-none whitespace-nowrap">
            Crypto Portfolio
            <span className="hidden sm:inline text-signal font-mono text-[10px] align-super ml-0.5">/ledger</span>
          </span>
        </Link>
      </div>

      {/* Navbar links for larger screens */}
      <ul className="text-white md:flex hidden list-none flex-row justify-between items-center h-full">
        {menuItems.map((item) => (
          <NavBarItem
            key={item.path}
            title={item.title}
            path={item.path}
            requiresWallet={item.requiresWallet && !isConnectedToSite}
            active={
              location.pathname === item.path ||
              (item.path === "/allowance" && (location.pathname === "/approveallowance" || location.pathname === "/allowancecheck"))
            }
          />
        ))}
      </ul>
      <Tooltip id="nav-wallet-required-tooltip" />

      {/* Mobile menu toggle */}
      <div className="flex relative items-center">
        {!toggleMenu ? (
          <HiMenuAlt4
            fontSize={24}
            className="text-white md:hidden cursor-pointer hover:text-signal transition duration-200"
            onClick={() => setToggleMenu(true)}
            aria-label="Open menu"
          />
        ) : (
          <AiOutlineClose
            fontSize={24}
            className="text-white md:hidden cursor-pointer hover:text-signal transition duration-200"
            onClick={() => setToggleMenu(false)}
            aria-label="Close menu"
          />
        )}

        {toggleMenu && (
          <ul
            className="z-50 fixed top-0 right-0 p-6 w-[70vw] h-screen shadow-2xl md:hidden list-none
            flex flex-col justify-start items-end rounded-l-xl bg-surface border-l border-white/5 text-white animate-slide-in"
          >
            <li className="text-lg w-full my-2 flex justify-between items-center border-b border-white/5 pb-4">
              <span className="text-signal font-extrabold tracking-wider">MENU</span>
              <AiOutlineClose
                onClick={() => setToggleMenu(false)}
                className="cursor-pointer hover:text-signal transition duration-200"
                aria-label="Close menu"
              />
            </li>
            {menuItems.map((item) => (
              <NavBarItem
                key={item.path}
                title={item.title}
                path={item.path}
                requiresWallet={item.requiresWallet && !isConnectedToSite}
                active={location.pathname === item.path}
                classprops="my-2 text-lg w-full text-right"
                closeMenu={() => setToggleMenu(false)}
              />
            ))}
            {/* Wallet chip lives here too — the compact desktop chip is hidden
                below md, so this is the only reachable Disconnect on mobile. */}
            {isConnectedToSite && (
              <li className="w-full mt-4 pt-4 border-t border-white/5">
                <WalletChip currentAccount={currentAccount} onDisconnect={handleDisconnect} full />
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Wallet Connection Section */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {isConnectedToSite ? (
          <div className="hidden md:block">
            <WalletChip currentAccount={currentAccount} onDisconnect={handleDisconnect} />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2.5 bg-white/[0.02] border border-white/5 pl-2 sm:pl-2.5 pr-1 sm:pr-2.5 py-1 rounded-lg">
            {/* Grey disconnected dot */}
            <span className="relative hidden sm:inline-flex rounded-full h-2 w-2 bg-slate-600"></span>
            <Button
              className="text-[11px] sm:text-xs py-1.5 px-3 sm:px-4 whitespace-nowrap"
              onClick={handleConnect}
              disabled={isConnecting}
              data-tooltip-id="connect-wallet-tooltip"
              data-tooltip-content="Connect your Ethereum wallet to access the dashboard"
            >
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </Button>
          </div>
        )}
        <Tooltip id="connect-wallet-tooltip" />
      </div>
    </nav>
  );
};

export default Navbar;
