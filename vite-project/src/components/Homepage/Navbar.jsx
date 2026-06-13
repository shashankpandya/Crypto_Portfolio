import React, { useContext } from "react";
import { HiMenuAlt4 } from "react-icons/hi";
import { AiOutlineClose } from "react-icons/ai";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Tooltip } from "react-tooltip";

import { TransactionContext } from "../../context/TransactionContext";

const NavBarItem = ({ title, path, active, closeMenu, classprops }) => (
  <li className={`mx-4 relative group ${classprops || ""}`}>
    <Link
      to={path}
      onClick={closeMenu}
      className={`text-sm font-semibold transition duration-300 py-2 block ${
        active
          ? "text-white font-bold"
          : "text-[#a1a7bb] hover:text-white"
      }`}
    >
      {title}
    </Link>
    {/* Underline sliding indicator */}
    <span
      className={`absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#14b8a6] to-[#06b6d4] transition-all duration-300 ${
        active ? "w-full" : "w-0 group-hover:w-full"
      }`}
    ></span>
  </li>
);

const Navbar = () => {
  const [toggleMenu, setToggleMenu] = React.useState(false);
  const { connectWallet, currentAccount, disconnectWallet, isConnectedToSite, isAdmin } =
    useContext(TransactionContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleConnect = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    navigate("/");
  };

  const menuItems = [
    { title: "Home", path: "/" },
    { title: "Watchlist", path: "/watchlist" },
    { title: "Transfer", path: "/transfer" },
    { title: "Approve Allowance", path: "/approveallowance" },
    { title: "Allowance Check", path: "/allowancecheck" },
    ...(isAdmin ? [{ title: "Admin Panel", path: "/admin" }] : []),
  ];

  return (
    <nav className="sticky top-0 w-full flex md:justify-center justify-between items-center p-4 premium-glass-nav z-50 transition-all duration-300">
      {/* Brand logo: compact stacked layout */}
      <div className="md:flex-[0.5] flex-initial justify-center items-center text-2xl font-black tracking-tight">
        <Link to="/" className="flex items-center space-x-3 group">
          <span className="p-2 rounded-xl bg-gradient-to-br from-[#14b8a6] to-[#06b6d4] text-white shadow-lg shadow-teal-500/10 group-hover:scale-105 transition-all duration-300">
            <div className="w-4 h-4 rounded-full bg-white relative">
              <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-[#14b8a6] to-[#06b6d4]"></div>
            </div>
          </span>
          <div className="flex flex-col leading-none text-left select-none">
            <span className="text-[10px] uppercase tracking-widest text-[#a1a7bb] font-extrabold">Crypto</span>
            <span className="text-base font-black tracking-tight text-white group-hover:text-[#14b8a6] transition-colors duration-200">Portfolio</span>
          </div>
        </Link>
      </div>

      {/* Navbar links for larger screens */}
      {isConnectedToSite && (
        <ul className="text-white md:flex hidden list-none flex-row justify-between items-center flex-initial">
          {menuItems.map((item, index) => (
            <NavBarItem
              key={index}
              title={item.title}
              path={item.path}
              active={location.pathname === item.path}
            />
          ))}
        </ul>
      )}

      {/* Mobile menu toggle */}
      <div className="flex relative">
        {!toggleMenu ? (
          <HiMenuAlt4
            fontSize={28}
            className="text-white md:hidden cursor-pointer hover:text-[#14b8a6] transition duration-200"
            onClick={() => setToggleMenu(true)}
            aria-label="Open menu"
          />
        ) : (
          <AiOutlineClose
            fontSize={28}
            className="text-white md:hidden cursor-pointer hover:text-[#14b8a6] transition duration-200"
            onClick={() => setToggleMenu(false)}
            aria-label="Close menu"
          />
        )}

        {toggleMenu && (
          <ul
            className="z-50 fixed top-0 right-0 p-4 w-[75vw] h-screen shadow-2xl md:hidden list-none
            flex flex-col justify-start items-end rounded-l-2xl bg-[#1f2937] bg-opacity-98 border-l border-[#374151] text-white animate-slide-in"
          >
            <li className="text-xl w-full my-2 flex justify-between items-center border-b border-[#374151] pb-4">
              <span className="text-[#14b8a6] font-extrabold tracking-wider">MENU</span>
              <AiOutlineClose
                onClick={() => setToggleMenu(false)}
                className="cursor-pointer hover:text-[#14b8a6] transition duration-200"
                aria-label="Close menu"
              />
            </li>
            {isConnectedToSite &&
              menuItems.map((item, index) => (
                <NavBarItem
                  key={index}
                  title={item.title}
                  path={item.path}
                  active={location.pathname === item.path}
                  classprops="my-3 text-xl w-full text-right"
                  closeMenu={() => setToggleMenu(false)}
                />
              ))}
          </ul>
        )}
      </div>

      {/* Wallet Connection Section */}
      <div className="flex items-center space-x-4 ml-4">
        {isConnectedToSite ? (
          <div className="flex items-center space-x-3 bg-[#111827]/60 border border-[#374151]/80 px-4 py-2 rounded-full shadow-lg backdrop-filter backdrop-blur-sm">
            {/* Pulsating green dot */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16c784] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16c784]"></span>
            </span>
            <p className="text-[#a1a7bb] font-mono text-xs font-bold tracking-tight">
              {`${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`}
            </p>
            <button
              className="bg-[#ea3943]/20 hover:bg-[#ea3943] hover:text-white border border-[#ea3943]/30 text-[#ea3943] text-xs font-bold py-1.5 px-3.5 rounded-full transition duration-200 hover:shadow-lg"
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-3 bg-[#111827]/40 border border-[#374151]/40 px-3 py-1.5 rounded-full">
            {/* Grey dot */}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-650"></span>
            <button
              className="premium-btn text-white text-xs font-bold py-2 px-5 rounded-full transition duration-300"
              onClick={handleConnect}
              data-tooltip-id="connect-wallet-tooltip"
              data-tooltip-content="Connect your Ethereum wallet to interact with the app"
            >
              Connect Wallet
            </button>
          </div>
        )}
        <Tooltip id="connect-wallet-tooltip" />
      </div>
    </nav>
  );
};

export default Navbar;
