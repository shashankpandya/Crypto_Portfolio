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
      className={`text-base font-semibold transition duration-300 py-2 block ${
        active
          ? "text-teal-400 font-bold"
          : "text-gray-300 hover:text-white"
      }`}
    >
      {title}
    </Link>
    {/* Underline sliding indicator */}
    <span
      className={`absolute bottom-0 left-0 h-[2px] bg-teal-400 transition-all duration-300 ${
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
    <nav className="sticky top-0 w-full flex md:justify-center justify-between items-center p-4 bg-gray-900 bg-opacity-70 backdrop-filter backdrop-blur-md border-b border-gray-800 shadow-xl z-50 transition-all duration-300">
      <div className="md:flex-[0.5] flex-initial justify-center items-center text-teal-400 text-3xl font-extrabold tracking-wider filter drop-shadow-[0_2px_8px_rgba(20,184,166,0.2)]">
        <Link to="/" className="hover:opacity-90 transition duration-300">
          CRYPTO PORTFOLIO
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
            className="text-white md:hidden cursor-pointer hover:text-teal-400 transition duration-200"
            onClick={() => setToggleMenu(true)}
            aria-label="Open menu"
          />
        ) : (
          <AiOutlineClose
            fontSize={28}
            className="text-white md:hidden cursor-pointer hover:text-teal-400 transition duration-200"
            onClick={() => setToggleMenu(false)}
            aria-label="Close menu"
          />
        )}

        {toggleMenu && (
          <ul
            className="z-50 fixed top-0 right-0 p-4 w-[75vw] h-screen shadow-2xl md:hidden list-none
            flex flex-col justify-start items-end rounded-l-2xl bg-gray-950 bg-opacity-95 backdrop-filter backdrop-blur-lg border-l border-gray-800 text-white animate-slide-in animate-fade-in"
          >
            <li className="text-xl w-full my-2 flex justify-between items-center border-b border-gray-800 pb-4">
              <span className="text-teal-400 font-extrabold tracking-wider">MENU</span>
              <AiOutlineClose
                onClick={() => setToggleMenu(false)}
                className="cursor-pointer hover:text-teal-400 transition duration-200"
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
          <div className="flex items-center space-x-3 bg-teal-950 bg-opacity-35 border border-teal-500/20 px-4 py-2 rounded-full shadow-lg shadow-teal-950/10 backdrop-filter backdrop-blur-sm">
            {/* Pulsating green dot */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-teal-400 font-mono text-sm font-bold tracking-tight">
              {`${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`}
            </p>
            <button
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-1.5 px-3.5 rounded-full transition duration-200 hover:shadow-lg hover:shadow-rose-900/20"
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-3 bg-gray-900 bg-opacity-50 border border-gray-800 px-3 py-1.5 rounded-full">
            {/* Grey dot */}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-600"></span>
            <button
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white text-sm font-bold py-1.5 px-5 rounded-full transition duration-300 transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/10"
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
