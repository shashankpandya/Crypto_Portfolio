import React, { useState, useContext } from "react";
import { HiMenuAlt4 } from "react-icons/hi";
import { AiOutlineClose } from "react-icons/ai";
import { Link } from "react-router-dom";
import { TransactionContext } from "../../context/TransactionContext";

const NavBarItem = ({ title, classprops, to }) => (
  <li className={`mx-4 cursor-pointer ${classprops}`}>
    <Link to={to}>{title}</Link>
  </li>
);

const Navbar = () => {
  const [toggleMenu, setToggleMenu] = useState(false);
  const { connectWallet, currentAccount, disconnectWallet, isConnectedToSite } = useContext(TransactionContext);

  return (
    <nav className="w-full flex md:justify-center justify-between items-center p-4 bg-gray-800 shadow-lg z-50 sticky top-0">
      <div className="md:flex-[0.5] flex-initial justify-center items-center text-teal-400 text-2xl md:text-3xl font-bold">
        <Link to="/">CRYPTO PORTFOLIO</Link>
      </div>
      <ul className="text-white md:flex hidden list-none flex-row justify-between items-center flex-initial">
        {isConnectedToSite && (
          <>
            <NavBarItem title="Watchlist" to="/watchlist" />
            <NavBarItem title="Transfer" to="/transfer" />
            <NavBarItem title="Approve Allowance" to="/approveallowance" />
            <NavBarItem title="Check Allowance" to="/allowancecheck" />
          </>
        )}
        <li className="bg-teal-500 py-2 px-7 mx-4 rounded-full cursor-pointer hover:bg-teal-600">
          {!isConnectedToSite ? (
            <button onClick={connectWallet}>Connect Wallet</button>
          ) : (
            <button onClick={disconnectWallet}>Disconnect</button>
          )}
        </li>
      </ul>
      <div className="flex relative">
        {!toggleMenu && (
          <HiMenuAlt4 fontSize={28} className="text-white md:hidden cursor-pointer" onClick={() => setToggleMenu(true)} />
        )}
        {toggleMenu && (
          <AiOutlineClose fontSize={28} className="text-white md:hidden cursor-pointer" onClick={() => setToggleMenu(false)} />
        )}
        {toggleMenu && (
          <ul
            className="z-50 fixed -top-0 -right-2 p-3 w-[70vw] h-screen shadow-2xl md:hidden list-none
            flex flex-col justify-start items-end rounded-md bg-gray-900 text-white animate-slide-in"
          >
            <li className="text-xl w-full my-2"><AiOutlineClose onClick={() => setToggleMenu(false)} /></li>
            {isConnectedToSite && (
              <>
                <NavBarItem title="Watchlist" classprops="my-2 text-lg" to="/watchlist" />
                <NavBarItem title="Transfer" classprops="my-2 text-lg" to="/transfer" />
                <NavBarItem title="Approve Allowance" classprops="my-2 text-lg" to="/approveallowance" />
                <NavBarItem title="Check Allowance" classprops="my-2 text-lg" to="/allowancecheck" />
              </>
            )}
            <li className="bg-teal-500 py-2 px-7 mx-4 my-2 rounded-full cursor-pointer hover:bg-teal-600">
              {!isConnectedToSite ? (
                <button onClick={connectWallet}>Connect Wallet</button>
              ) : (
                <button onClick={disconnectWallet}>Disconnect</button>
              )}
            </li>
          </ul>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
